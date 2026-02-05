"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { z } from "zod";

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
  } catch {
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
            .prepare(`PRAGMA table_info(${JSON.stringify(table)})`)
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
          .prepare(`PRAGMA foreign_key_list(${JSON.stringify(table)})`)
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
  } catch {
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
  for (const match of sql.matchAll(createTableRegex)) {
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
  } catch {
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

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

type DeniedResult = {
  status: "denied";
  message: string;
};

function toSafeLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

async function denyUnlessAdmin(): Promise<DeniedResult | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const role = (session?.user as { role?: unknown } | undefined)?.role;
  if (!session || role !== "admin") {
    return {
      status: "denied",
      message:
        "Access denied. Administrative privileges are required to view business data.",
    };
  }

  return null;
}

export type BusinessOrder = {
  id: string;
  amount: number;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type BusinessCustomer = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type FetchBusinessDataResult =
  | DeniedResult
  | {
      status: "ok";
      entity: "orders";
      data: BusinessOrder[];
    }
  | {
      status: "ok";
      entity: "customers";
      data: BusinessCustomer[];
    }
  | {
      status: "error";
      message: string;
    };

export async function fetchBusinessData(
  entity: string,
  limit?: number,
): Promise<FetchBusinessDataResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const take = toSafeLimit(limit);

  if (entity === "orders") {
    const orders = await prisma.order.findMany({
      take,
      orderBy: {
        amount: "desc",
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      status: "ok",
      entity: "orders",
      data: orders.map((o) => ({
        id: o.id,
        amount: o.amount,
        createdAt: o.createdAt.toISOString(),
        customer: o.customer,
      })),
    };
  }

  if (entity === "customers") {
    const customers = await prisma.customer.findMany({
      take,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      status: "ok",
      entity: "customers",
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  return {
    status: "error",
    message: `Unknown entity: ${entity}`,
  };
}

export type GetStatsResult =
  | DeniedResult
  | {
      status: "ok";
      totalRevenue: number;
      totalCustomers: number;
    };

export async function getStats(): Promise<GetStatsResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const [orderAgg, totalCustomers] = await Promise.all([
    prisma.order.aggregate({
      _sum: {
        amount: true,
      },
    }),
    prisma.customer.count(),
  ]);

  return {
    status: "ok",
    totalRevenue: orderAgg._sum.amount ?? 0,
    totalCustomers,
  };
}

export type InviteMemberResult = {
  success: true;
  inviteLink: string;
};

export async function inviteMember(
  email: string,
  role: "ADMIN" | "VIEWER",
): Promise<InviteMemberResult> {
  z.string().email().parse(email);
  z.enum(["ADMIN", "VIEWER"]).parse(role);

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 1000);
  });

  return {
    success: true,
    inviteLink: `https://cortex.dev/join/${crypto.randomUUID()}`,
  };
}
