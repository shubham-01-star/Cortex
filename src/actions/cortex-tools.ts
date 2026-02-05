"use server";

import fs from "node:fs/promises";
import path from "node:path";

type ReactFlowPosition = {
  x: number;
  y: number;
};

export type ReactFlowNode = {
  id: string;
  position: ReactFlowPosition;
  data: {
    label: string;
    columns: string[];
  };
};

export type ReactFlowEdge = {
  id: string;
  source: string;
  target: string;
};

export type VisualizeSchemaResult = {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  source?: "prisma-dmmf" | "sqlite" | "setup-script";
  error?: string;
};

function buildGridPositions(ids: string[]) {
  const nodeWidth = 260;
  const nodeHeight = 220;
  const gutter = 40;

  const cols = Math.max(1, Math.ceil(Math.sqrt(ids.length)));

  return new Map(
    ids.map((id, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      return [
        id,
        {
          x: col * (nodeWidth + gutter),
          y: row * (nodeHeight + gutter),
        },
      ] as const;
    }),
  );
}

async function visualizeFromPrismaDmmf(): Promise<Omit<
  VisualizeSchemaResult,
  "source"
> | null> {
  try {
    const prismaModuleName: string = "@prisma/client";
    const prismaClient = (await import(prismaModuleName)) as unknown;

    type PrismaDmmfModelField = {
      name: string;
      kind: string;
      type: unknown;
      relationName?: string | null;
    };

    type PrismaDmmfModel = {
      name: string;
      fields: PrismaDmmfModelField[];
    };

    type PrismaDmmf = {
      datamodel?: {
        models?: PrismaDmmfModel[];
      };
    };

    const prismaDmmf = (prismaClient as { Prisma?: { dmmf?: PrismaDmmf } })
      .Prisma?.dmmf;
    const models = prismaDmmf?.datamodel?.models;

    if (!models || !Array.isArray(models) || models.length === 0) {
      return null;
    }

    const modelNames = models.map((m) => m.name);
    const positions = buildGridPositions(modelNames);

    const nodes: ReactFlowNode[] = models.map((model) => ({
      id: model.name,
      position: positions.get(model.name) ?? { x: 0, y: 0 },
      data: {
        label: model.name,
        columns: model.fields
          .filter((f) => f.kind !== "object")
          .map((f) => f.name),
      },
    }));

    const edgesById = new Map<string, ReactFlowEdge>();

    for (const model of models) {
      for (const field of model.fields) {
        if (field.kind !== "object") continue;
        if (typeof field.type !== "string") continue;
        if (!modelNames.includes(field.type)) continue;

        const relationName =
          typeof field.relationName === "string" &&
          field.relationName.length > 0
            ? field.relationName
            : field.name;

        const normalizedA = [model.name, field.type].sort().join("|");
        const edgeId = `${normalizedA}:${relationName}`;

        if (!edgesById.has(edgeId)) {
          edgesById.set(edgeId, {
            id: edgeId,
            source: model.name,
            target: field.type,
          });
        }
      }
    }

    return { nodes, edges: Array.from(edgesById.values()) };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("visualizeFromPrismaDmmf failed", err);
    }

    return null;
  }
}

async function visualizeFromSqliteDb(): Promise<Omit<
  VisualizeSchemaResult,
  "source"
> | null> {
  try {
    const sqlitePath = path.join(process.cwd(), "sqlite.db");
    await fs.access(sqlitePath);

    const { default: Database } = await import("better-sqlite3");
    const db = new Database(sqlitePath, { readonly: true });
    const quoteSqlString = (value: string) =>
      `'${value.replaceAll("'", "''")}'`;

    try {
      const tableNames = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as Array<{ name: string }>;

      const names = tableNames.map((r) => r.name);

      if (names.length === 0) return null;

      const positions = buildGridPositions(names);
      const nodes: ReactFlowNode[] = names.map((table) => {
        const columns = (
          db
            .prepare(`PRAGMA table_info(${quoteSqlString(table)})`)
            .all() as Array<{ name: string }>
        ).map((r) => r.name);

        return {
          id: table,
          position: positions.get(table) ?? { x: 0, y: 0 },
          data: { label: table, columns },
        };
      });

      const edges: ReactFlowEdge[] = [];
      for (const table of names) {
        const fks = db
          .prepare(`PRAGMA foreign_key_list(${quoteSqlString(table)})`)
          .all() as Array<{ table: string; from: string; to: string }>;

        for (const fk of fks) {
          if (!names.includes(fk.table)) continue;
          const edgeId = `${table}.${fk.from}->${fk.table}.${fk.to}`;
          edges.push({ id: edgeId, source: table, target: fk.table });
        }
      }

      return { nodes, edges };
    } finally {
      db.close();
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("visualizeFromSqliteDb failed", err);
    }

    return null;
  }
}

type SetupScriptTable = {
  name: string;
  columns: string[];
  edges: Array<{ target: string; fromColumn: string; targetColumn: string }>;
};

function parseCreateTableStatements(sql: string): SetupScriptTable[] {
  const createTableRegex =
    /CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/g;

  const tables: SetupScriptTable[] = [];
  let sawCreateTable = false;
  for (const match of sql.matchAll(createTableRegex)) {
    sawCreateTable = true;
    const tableName = match[1];
    const rawBody = match[2] ?? "";
    const lines = rawBody
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const columns: string[] = [];
    const edges: SetupScriptTable["edges"] = [];

    for (const line of lines) {
      const cleaned = line.replace(/,$/, "");
      if (cleaned.toUpperCase().startsWith("PRIMARY KEY")) continue;
      if (cleaned.toUpperCase().startsWith("CONSTRAINT")) continue;
      if (cleaned.toUpperCase().startsWith("FOREIGN KEY")) continue;

      const colName = cleaned.split(/\s+/)[0];
      if (!colName) continue;
      columns.push(colName);

      const refMatch = /\bREFERENCES\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i.exec(
        cleaned,
      );
      if (refMatch) {
        edges.push({
          target: refMatch[1],
          fromColumn: colName,
          targetColumn: refMatch[2].trim(),
        });
      }
    }

    tables.push({ name: tableName, columns, edges });
  }

  if (!sawCreateTable && process.env.NODE_ENV !== "production") {
    console.warn(
      "No CREATE TABLE statements were parsed from setup script SQL.",
    );
  }

  const tablesByName = new Map(tables.map((t) => [t.name, t] as const));
  for (const table of tables) {
    table.edges = table.edges.filter((edge) => {
      const targetTable = tablesByName.get(edge.target);

      if (!targetTable) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `Invalid FK edge parsed from setup script: ${table.name}.${edge.fromColumn} -> ${edge.target}.${edge.targetColumn}`,
          );
        }

        return false;
      }

      const isValid = targetTable.columns.includes(edge.targetColumn);

      if (!isValid && process.env.NODE_ENV !== "production") {
        console.warn(
          `Invalid FK edge parsed from setup script: ${table.name}.${edge.fromColumn} -> ${edge.target}.${edge.targetColumn}`,
        );
      }

      return isValid;
    });
  }

  return tables;
}

async function visualizeFromSetupScript(): Promise<Omit<
  VisualizeSchemaResult,
  "source"
> | null> {
  try {
    const setupScriptPath = path.join(
      process.cwd(),
      "scripts",
      "setup-sqlite.mjs",
    );
    const setupScript = await fs.readFile(setupScriptPath, "utf8");

    const schemaMatch = /const\s+schema\s*=\s*`([\s\S]*?)`;/m.exec(setupScript);

    const sql = schemaMatch?.[1];
    if (!sql) return null;

    const tables = parseCreateTableStatements(sql);
    if (tables.length === 0) return null;

    const tableNames = tables.map((t) => t.name);
    const positions = buildGridPositions(tableNames);

    const nodes: ReactFlowNode[] = tables.map((t) => ({
      id: t.name,
      position: positions.get(t.name) ?? { x: 0, y: 0 },
      data: {
        label: t.name,
        columns: t.columns,
      },
    }));

    const edgesById = new Map<string, ReactFlowEdge>();
    for (const table of tables) {
      for (const edge of table.edges) {
        if (!tableNames.includes(edge.target)) continue;
        const edgeId = `${table.name}.${edge.fromColumn}->${edge.target}.${edge.targetColumn}`;
        edgesById.set(edgeId, {
          id: edgeId,
          source: table.name,
          target: edge.target,
        });
      }
    }

    return { nodes, edges: Array.from(edgesById.values()) };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("visualizeFromSetupScript failed", err);
    }

    return null;
  }
}

export async function visualizeSchema(): Promise<VisualizeSchemaResult> {
  try {
    const prisma = await visualizeFromPrismaDmmf();
    if (prisma) return { ...prisma, source: "prisma-dmmf" };

    const sqlite = await visualizeFromSqliteDb();
    if (sqlite) return { ...sqlite, source: "sqlite" };

    const setupScript = await visualizeFromSetupScript();
    if (setupScript) return { ...setupScript, source: "setup-script" };

    return {
      nodes: [],
      edges: [],
      error:
        "No schema could be loaded (missing Prisma DMMF, sqlite.db, and setup script schema).",
    };
  } catch (err) {
    return {
      nodes: [],
      edges: [],
      error:
        err instanceof Error
          ? err.message
          : "Unknown error while generating schema visualization.",
    };
  }
}
