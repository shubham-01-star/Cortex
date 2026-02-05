"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

type ReactFlowPosition = {
  x: number;
  y: number;
};

export type ReactFlowNode<TData> = {
  id: string;
  position: ReactFlowPosition;
  data: TData;
};

export type ReactFlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type ModelNodeData = {
  label: string;
  columns: string[];
};

export type VisualizeSchemaResult = {
  nodes: Array<ReactFlowNode<ModelNodeData>>;
  edges: Array<ReactFlowEdge>;
  error?: string;
};

type ParsedModel = {
  name: string;
  fieldLines: string[];
};

type ParsedRelationField = {
  fieldName: string;
  targetModel: string;
  relationName?: string;
  isOwningSide: boolean;
};

function readModelBlocks(schema: string): ParsedModel[] {
  const models: ParsedModel[] = [];
  const lines = schema.split(/\r?\n/);

  let current: ParsedModel | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!current) {
      const match = /^model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/.exec(line);
      if (match) {
        current = { name: match[1], fieldLines: [] };
      }
      continue;
    }

    if (line === "}") {
      models.push(current);
      current = null;
      continue;
    }

    if (line.length === 0 || line.startsWith("//")) {
      continue;
    }

    current.fieldLines.push(line);
  }

  return models;
}

function getBaseType(typeToken: string): string {
  return typeToken.replace(/\[\]$/u, "").replace(/\?$/u, "");
}

function parseRelationName(fieldLine: string): string | undefined {
  const relationCall = /@relation\(([^)]*)\)/u.exec(fieldLine);
  if (!relationCall) return undefined;

  const quoted = /"([^"]+)"/u.exec(relationCall[1]);
  return quoted?.[1];
}

function parseModelFieldLine(
  fieldLine: string,
):
  | { kind: "field"; fieldName: string; typeToken: string }
  | { kind: "attribute" }
  | { kind: "unknown" } {
  if (fieldLine.startsWith("@@")) return { kind: "attribute" };

  const tokens = fieldLine.split(/\s+/u);
  if (tokens.length < 2) return { kind: "unknown" };

  const [fieldName, typeToken] = tokens;
  if (!fieldName || !typeToken) return { kind: "unknown" };

  return { kind: "field", fieldName, typeToken };
}

function buildReactFlowGraphFromSchema(
  schema: string,
): Omit<VisualizeSchemaResult, "error"> {
  const parsedModels = readModelBlocks(schema);
  const modelNames = new Set(parsedModels.map((m) => m.name));

  const nodes: Array<ReactFlowNode<ModelNodeData>> = parsedModels.map(
    (model, index) => {
      const columns: string[] = [];

      for (const fieldLine of model.fieldLines) {
        const parsed = parseModelFieldLine(fieldLine);
        if (parsed.kind !== "field") continue;

        const baseType = getBaseType(parsed.typeToken);
        if (modelNames.has(baseType)) continue;

        columns.push(parsed.fieldName);
      }

      return {
        id: model.name,
        position: {
          x: (index % 4) * 260,
          y: Math.floor(index / 4) * 160,
        },
        data: {
          label: model.name,
          columns,
        },
      };
    },
  );

  const edges: ReactFlowEdge[] = [];
  const emittedEdgeKeys = new Set<string>();
  const emittedRelations = new Set<string>();

  for (const model of parsedModels) {
    for (const fieldLine of model.fieldLines) {
      const parsed = parseModelFieldLine(fieldLine);
      if (parsed.kind !== "field") continue;

      const baseType = getBaseType(parsed.typeToken);
      if (!modelNames.has(baseType)) continue;

      const relationField: ParsedRelationField = {
        fieldName: parsed.fieldName,
        targetModel: baseType,
        relationName: parseRelationName(fieldLine),
        isOwningSide: /@relation\([^)]*\bfields\s*:/u.test(fieldLine),
      };

      const label = relationField.relationName ?? relationField.fieldName;

      let source = model.name;
      let target = relationField.targetModel;
      let shouldEmit = true;

      if (!relationField.isOwningSide) {
        const pair = [source, target].sort();
        source = pair[0];
        target = pair[1];

        if (relationField.relationName) {
          const relationKey = `${relationField.relationName}|${source}|${target}`;
          shouldEmit = !emittedRelations.has(relationKey);
          if (shouldEmit) emittedRelations.add(relationKey);
        } else {
          shouldEmit = model.name === source;
        }
      }

      if (!shouldEmit) continue;

      const edge: ReactFlowEdge = {
        id: `${source}-${target}-${label}`,
        source,
        target,
        label,
      };

      const edgeKey = `${edge.source}|${edge.target}|${edge.label ?? ""}`;
      if (emittedEdgeKeys.has(edgeKey)) continue;

      emittedEdgeKeys.add(edgeKey);
      edges.push(edge);
    }
  }

  return { nodes, edges };
}

function buildReactFlowGraphFromSqlite(
  dbPath: string,
): Omit<VisualizeSchemaResult, "error"> {
  const db = new Database(dbPath);

  const quoteSqlString = (value: string) => `'${value.replaceAll("'", "''")}'`;

  try {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    const nodes: Array<ReactFlowNode<ModelNodeData>> = tables.map(
      (t, index) => {
        const columns = db
          .prepare(`PRAGMA table_info(${quoteSqlString(t.name)})`)
          .all() as Array<{ name: string }>;

        return {
          id: t.name,
          position: {
            x: (index % 4) * 260,
            y: Math.floor(index / 4) * 160,
          },
          data: {
            label: t.name,
            columns: columns.map((c) => c.name),
          },
        };
      },
    );

    const edges: ReactFlowEdge[] = [];
    const emitted = new Set<string>();

    for (const t of tables) {
      const foreignKeys = db
        .prepare(`PRAGMA foreign_key_list(${quoteSqlString(t.name)})`)
        .all() as Array<{ table: string; from: string; to: string }>;

      for (const fk of foreignKeys) {
        const label = `${fk.from} -> ${fk.to}`;
        const edgeKey = `${t.name}|${fk.table}|${label}`;
        if (emitted.has(edgeKey)) continue;

        emitted.add(edgeKey);
        edges.push({
          id: `${t.name}-${fk.table}-${fk.from}-${fk.to}`,
          source: t.name,
          target: fk.table,
          label,
        });
      }
    }

    return { nodes, edges };
  } finally {
    db.close();
  }
}

export async function visualizeSchema(): Promise<VisualizeSchemaResult> {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const sqlitePath = path.join(process.cwd(), "sqlite.db");

  try {
    const schema = await readFile(schemaPath, "utf8");
    const { nodes, edges } = buildReactFlowGraphFromSchema(schema);

    if (nodes.length === 0) {
      return {
        nodes,
        edges,
        error: `No Prisma models were detected in ${schemaPath}.`,
      };
    }

    return { nodes, edges };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    try {
      const { nodes, edges } = buildReactFlowGraphFromSqlite(sqlitePath);
      if (nodes.length > 0) return { nodes, edges };
    } catch {
      // Ignore and return original Prisma schema error below.
    }

    return {
      nodes: [],
      edges: [],
      error: `Failed to read/parse Prisma schema at ${schemaPath}: ${message}`,
    };
  }
}
