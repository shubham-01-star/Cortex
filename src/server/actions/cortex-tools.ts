"use server";

import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";
import fs from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { z } from "zod";
import { logger } from "@/lib/logger";

type ReactFlowPosition = {
  x: number;
  y: number;
};

export type ReactFlowNode = {
  id: string;
  type?: string;
  position: ReactFlowPosition;
  data: {
    label: string;
    fields: Array<{ name: string; type: string; isId: boolean }>;
  };
};

export type ReactFlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type VisualizeSchemaResult = {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  source?: "prisma-dmmf" | "sqlite" | "setup-script" | "dynamic-db";
  error?: string;
};

// Basic grid layout calculator
function buildGridPositions(nodes: any[]) {
  const nodeWidth = 260;
  const gutter = 80; // Increased gutter
  const defaultHeight = 220;

  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));

  // Track the max height in each row so we can stack rows properly
  const rowHeights = new Map<number, number>();

  // Use a map to return positions
  const positions = new Map<string, { x: number, y: number }>();

  // First pass: Calculate row heights
  nodes.forEach((node, index) => {
    const row = Math.floor(index / cols);
    const fieldCount = node.data?.fields?.length || 0;
    const height = 50 + (fieldCount * 30); // Approx 30px per row
    const currentMax = rowHeights.get(row) || 0;
    rowHeights.set(row, Math.max(currentMax, height));
  });

  // Second pass: Set positions
  let currentY = 0;
  for (let r = 0; r <= (nodes.length / cols); r++) {
    const rowHeight = rowHeights.get(r) || defaultHeight;

    // Process items in this row
    for (let c = 0; c < cols; c++) {
      const index = (r * cols) + c;
      if (index >= nodes.length) break;

      const node = nodes[index];
      positions.set(String(node.id), {
        x: c * (nodeWidth + gutter),
        y: currentY
      });
    }

    // Advance Y by this row's max height + gutter
    currentY += rowHeight + gutter;
  }

  return positions;
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
      type: "tableNode",
      position: positions.get(model.name) ?? { x: 0, y: 0 },
      data: {
        label: model.name,
        fields: model.fields
          .filter((f) => f.kind !== "object")
          .map((f) => ({
            name: f.name,
            type: String(f.type),
            isId: (f as any).isId || false,
          })),
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
    logger.error("Failed to visualize from Prisma DMMF", { error: err });
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
          type: "tableNode",
          position: positions.get(table) ?? { x: 0, y: 0 },
          data: {
            label: table,
            fields: columns.map((col) => ({
              name: col,
              type: "unknown",
              isId: col.toLowerCase() === "id",
            })),
          },
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
  } catch (err) {
    logger.error("Failed to visualize from SQLite DB", { error: err });
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
      type: "tableNode",
      position: positions.get(t.name) ?? { x: 0, y: 0 },
      data: {
        label: t.name,
        fields: t.columns.map((col) => ({
          name: col,
          type: "unknown",
          isId: col.toLowerCase() === "id",
        })),
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
    logger.error("Failed to visualize from Setup Script", { error: err });
    return null;
  }
}

export async function visualizeSchema(
  _params?: { focusTables?: string[] }
): Promise<VisualizeSchemaResult> {
  try {
    const dynamicSchema = await visualizeDynamicSchema();
    if (dynamicSchema && (dynamicSchema.nodes.length > 0 || dynamicSchema.error)) {
      if (!dynamicSchema.error) return { ...dynamicSchema, source: "dynamic-db" };
    }

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

function sanitizeForClient(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return value.toString("base64");
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeForClient(item));
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(entries.map(([k, v]) => [k, sanitizeForClient(v)]));
  }
  return value;
}

export async function denyUnlessPermission(requiredPermission: "READ" | "WRITE" | "DELETE" | "EXECUTE"): Promise<DeniedResult | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });


  if (!session) {
    return {
      status: "denied",
      message: "Access denied. Authentication required.",
    };
  }

  const user = session.user as any;
  const role = String(user.role || "").toLowerCase();
  const permissions = (user.permissions as string[]) || [];

  // Admins always have all permissions
  if (role === "admin") return null;

  if (!permissions.includes(requiredPermission)) {
    return {
      status: "denied",
      message: `Access denied. ${requiredPermission} permission is required for this action.`,
    };
  }

  return null;
}

/**
 * @deprecated Use denyUnlessPermission instead for granular control.
 */
async function denyUnlessAdmin(): Promise<DeniedResult | null> {
  return denyUnlessPermission("EXECUTE"); // Admins/Execute are highest tier
}

/**
 * @deprecated Use fetchDynamicBusinessData instead. This is part of the legacy business layer.
 */
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

/**
 * @deprecated Use fetchDynamicBusinessData instead. This is part of the legacy business layer.
 */
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

/**
 * @deprecated Use fetchDynamicBusinessData instead. The table-driven approach is preferred.
 */
export async function fetchBusinessData(
  entity: string,
  limit?: number,
): Promise<FetchBusinessDataResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { status: "error", message: "Unauthorized" };

  const { DynamicDbService } = await import("@/server/db/dynamic-db");
  const service = new DynamicDbService(session.user.id);
  const take = toSafeLimit(limit);

  try {
    await service.connect();

    // Mapping standard entity names to likely table names (simple heuristic)
    // In a real app we'd check the schema for best match
    const tableName = entity === "orders" ? "Order" : entity === "customers" ? "Customer" : entity;

    // Use Dynamic DB
    const rows = await service.executeQuery(tableName, take);
    const sanitized = sanitizeForClient(rows) as any[];

    if (entity === "orders") {
      return {
        status: "ok",
        entity: "orders",
        data: sanitized.map((row: any) => ({
          id: row.id || row.Id || "unknown",
          amount: Number(row.amount || row.total || row.price || 0),
          createdAt: String(row.createdAt || row.date || new Date().toISOString()),
          customer: row.customer || { email: "unknown@example.com" } // Fallback if join not present
        }))
      };
    }

    if (entity === "customers") {
      return {
        status: "ok",
        entity: "customers",
        data: sanitized.map((row: any) => ({
          id: row.id || row.Id || "unknown",
          name: row.name || row.firstName || "Unknown",
          email: row.email || "no-email",
          createdAt: String(row.createdAt || row.created_at || new Date().toISOString())
        }))
      };
    }

    return { status: "error", message: `Unknown entity: ${entity}` };

  } catch (err) {
    logger.error("Fetch Business Data Failed", { error: err, entity });
    return { status: "error", message: err instanceof Error ? err.message : "Failed to fetch data" };
  }
}

export type GetStatsResult =
  | DeniedResult
  | {
    status: "ok";
    totalRevenue: number;
    totalCustomers: number;
  };

/**
 * @deprecated Use dynamic analytics instead. This relies on fixed Prisma schema logic.
 */
/**
 * @deprecated Use dynamic analytics instead. Removed because it relied on deleted User/Order models.
 */
export async function getStats(): Promise<GetStatsResult> {
  return {
    status: "ok",
    totalRevenue: 0,
    totalCustomers: 0,
  };
}

// ========================================
// INTELLIGENT SCHEMA DISCOVERY
// ========================================

function detectBusinessTables(nodes: ReactFlowNode[]) {
  let ordersTable: { name: string; score: number; columns: Record<string, string> } | null = null;
  let customersTable: { name: string; score: number; columns: Record<string, string> } | null = null;

  for (const node of nodes) {
    const tableName = node.data.label;
    const fields = node.data.fields.map(f => f.name.toLowerCase());
    const fieldMap = Object.fromEntries(node.data.fields.map(f => [f.name.toLowerCase(), f.name]));

    // --- Score for "Orders" ---
    let orderScore = 0;
    const orderCols = {
      amount: fieldMap['amount'] || fieldMap['total'] || fieldMap['price'] || fieldMap['value'] || null,
      date: fieldMap['created_at'] || fieldMap['date'] || fieldMap['timestamp'] || fieldMap['order_date'] || null,
      id: fieldMap['id'] || fieldMap['order_id'] || null,
      customerId: fieldMap['customer_id'] || fieldMap['user_id'] || fieldMap['client_id'] || null
    };

    if (orderCols.amount) orderScore += 3;
    if (orderCols.date) orderScore += 1;
    if (orderCols.customerId) orderScore += 2;
    if (tableName.toLowerCase().includes('order')) orderScore += 2;
    if (tableName.toLowerCase().includes('sale')) orderScore += 2;
    if (tableName.toLowerCase().includes('transaction')) orderScore += 1;

    // Filter out unlikely tables
    if (tableName.toLowerCase().includes('user') && !orderCols.amount) orderScore -= 5; // Users usually aren't orders (unless amount present?)

    if (orderScore > 3 && (!ordersTable || orderScore > ordersTable.score)) {
      ordersTable = { name: tableName, score: orderScore, columns: orderCols as Record<string, string> };
    }

    // --- Score for "Customers" ---
    let customerScore = 0;
    const customerCols = {
      email: fieldMap['email'] || fieldMap['mail'] || null,
      name: fieldMap['name'] || fieldMap['fullname'] || fieldMap['first_name'] || null,
      id: fieldMap['id'] || fieldMap['user_id'] || fieldMap['customer_id'] || null,
      created: fieldMap['created_at'] || fieldMap['joined_at'] || fieldMap['date'] || null
    };

    if (customerCols.email) customerScore += 3;
    if (customerCols.name) customerScore += 2;
    if (customerCols.created) customerScore += 1;
    if (tableName.toLowerCase().includes('customer')) customerScore += 3;
    if (tableName.toLowerCase().includes('user')) customerScore += 2; // Users are often customers
    if (tableName.toLowerCase().includes('client')) customerScore += 2;

    if (customerScore > 3 && (!customersTable || customerScore > customersTable.score)) {
      customersTable = { name: tableName, score: customerScore, columns: customerCols as Record<string, string> };
    }
  }

  return { orders: ordersTable, customers: customersTable };
}


export type InviteMemberResult =
  | DeniedResult
  | {
    success: true;
    inviteLink: string;
  };

export async function inviteMember(
  email: string,
  role: "ADMIN" | "VIEWER",
): Promise<InviteMemberResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

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


export type VisualizeAnalyticsResult =
  | DeniedResult
  | {
    status: "ok";
    title: string;
    type: "bar" | "line";
    data: Array<{ name: string; value: number }>;
    xAxisKey: "name";
    dataKey: "value";
    description?: string;
  }
  | {
    status: "error";
    message: string;
  };


export async function visualizeAnalytics(
  tableName: string,
  xAxisColumn: string,
  yAxisColumn: string,
  operation: "sum" | "count" = "sum"
): Promise<VisualizeAnalyticsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { status: "denied", message: "Unauthorized" };
  }

  const { DynamicDbService } = await import("@/server/db/dynamic-db");
  const service = new DynamicDbService(session.user.id);

  try {
    await service.connect();

    // Flexible Query: Fetch raw data from the specified table
    // Limit to 500 for memory safety and sampling (BI tools behavior)
    const safeLimit = 500;
    const rows = await service.executeQuery(tableName, safeLimit) as any[];
    const sanitizedRows = sanitizeForClient(rows) as any[];

    if (!sanitizedRows || sanitizedRows.length === 0) {
      return { status: "error", message: `No data found in table '${tableName}'.` };
    }

    // ---------------------------------------------------------
    // GENERIC JS AGGREGATION ENGINE
    // ---------------------------------------------------------
    const grouped: Record<string, number> = {};

    sanitizedRows.forEach(row => {
      // X-Axis Handling (Dates need special normalization)
      let xValue = row[xAxisColumn];

      if (!xValue && xValue !== 0) xValue = "Unknown"; // Handle nulls

      // Try to normalize dates to YYYY-MM-DD if it looks like a date
      if (typeof xValue === 'string' && !isNaN(Date.parse(xValue)) && xValue.length > 10) {
        // Heuristic: Long date strings -> standardize
        try {
          xValue = new Date(xValue).toISOString().split('T')[0];
        } catch (e) { /* ignore */ }
      } else {
        xValue = String(xValue);
      }

      // Y-Axis Operation
      const yValue = Number(row[yAxisColumn]) || 0;

      if (operation === "sum") {
        grouped[xValue] = (grouped[xValue] || 0) + yValue;
      } else if (operation === "count") {
        grouped[xValue] = (grouped[xValue] || 0) + 1;
      }
    });

    // Format for Recharts
    const data = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort by X-Axis (usually time)

    // Auto-detect chart type preferrence
    // Time-series -> Line/Area
    // Categories -> Bar
    const isTimeSeries = data.some(d => d.name.match(/^\d{4}-\d{2}-\d{2}$/));
    const chartType = isTimeSeries ? "line" : "bar";

    return {
      status: "ok",
      title: `${operation.toUpperCase()} of ${yAxisColumn} by ${xAxisColumn}`,
      type: chartType,
      description: `Visualizing data from ${tableName}`,
      data,
      xAxisKey: "name",
      dataKey: "value"
    };

  } catch (err) {
    console.error("Analytics Error:", err);
    // Nice error message handling for the AI to read
    return { status: "error", message: `Failed to visualize: ${err instanceof Error ? err.message : "Unknown DB error"}` };
  }
}

export type ModifySchemaResult =
  | DeniedResult
  | {
    status: "pending_confirmation";
    tableName: string;
    columns: Array<{ name: string; type: string }>;
    suggestedAction: "create" | "alter";
  }
  | {
    status: "applied"; // In a real app, this would be a success result
    message: string;
  };

export async function modifySchema(
  tableName: string,
  columns: Array<{ name: string; type: string }>,
  action: "create" | "alter"
): Promise<ModifySchemaResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  // In a real application, this would:
  // 1. Generate a Prisma migration file
  // 2. Run 'prisma migrate deploy'
  // 3. Update the in-memory DMMF

  // For this demo (SQL-less interface concept), we return the "pending" state 
  // which tells the UI to render the <MigrationForm />.
  // The actual "Apply" button in the form would ideally call a 'confirmSchemaChange' action.

  // But wait, the PRD says "On submit -> schema change".
  // So the AI calls this tool to STARTS the process (Elicitation).
  // The tool returns data that triggers the UI.

  return {
    status: "pending_confirmation",
    tableName,
    columns,
    suggestedAction: action
  };
}

// ========================================
// DYNAMIC DATABASE FUNCTIONS
// ========================================

/**
 * Visualize schema from dynamically connected database
 */
export async function visualizeDynamicSchema(): Promise<VisualizeSchemaResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { nodes: [], edges: [], error: "Unauthorized" };
  }

  const { DynamicDbService } = await import("@/server/db/dynamic-db");
  const service = new DynamicDbService(session.user.id);

  try {
    await service.connect();

    const { nodes, edges } = await service.getSchemaGraph();

    // Limit tables for ERD performance
    const MAX_NODES = 25;

    // Ensure nodes is an array before slicing
    const rawNodes = Array.isArray(nodes) ? nodes : [];
    const rawEdges = Array.isArray(edges) ? edges : [];

    // Sort nodes to ensure consistent output (e.g. by name)
    const sortedNodes = [...rawNodes].sort((a, b) =>
      (a.data?.label || "").localeCompare(b.data?.label || "")
    );
    const limitedNodes = sortedNodes.slice(0, MAX_NODES);

    // Calculate Grid Positions
    const positions = buildGridPositions(limitedNodes);

    // Filter edges to only include those connected to visible nodes
    const nodeIds = new Set(limitedNodes.map(n => n.id));
    const limitedEdges = rawEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    // NUCLEAR SANITIZATION: Re-map to strictly plain objects
    // Also limit the number of columns per table to prevent huge payloads
    const MAX_COLUMNS = 30;

    const cleanNodes = limitedNodes.map(n => {
      // Safety check for fields
      const rawFields = Array.isArray(n.data?.fields) ? n.data.fields : [];
      const limitedFields = rawFields.length > MAX_COLUMNS
        ? rawFields.slice(0, MAX_COLUMNS)
        : rawFields;

      // Inject calculated position
      const pos = positions.get(String(n.id)) ?? { x: 0, y: 0 };

      return {
        id: String(n.id),
        type: String(n.type), // "tableNode"
        position: pos, // Critical for ReactFlow
        data: {
          label: String(n.data?.label || "Unknown"),
          fields: limitedFields.map(f => ({
            name: String(f.name || ""),
            type: String(f.type || ""),
            isId: Boolean(f.isId)
          })),
          truncated: rawFields.length > MAX_COLUMNS
        }
      };
    });

    const cleanEdges = limitedEdges.map(e => ({
      id: String(e.id),
      source: String(e.source),
      target: String(e.target),
      label: e.label ? String(e.label) : undefined
    }));

    // Verify serializability (debug log)
    try {
      JSON.stringify({ nodes: cleanNodes, edges: cleanEdges });
    } catch (e) {
      console.error("Serialization check failed:", e);
      return { nodes: [], edges: [], error: "Serialization failed" };
    }

    return {
      nodes: cleanNodes as ReactFlowNode[],
      edges: cleanEdges as ReactFlowEdge[],
    };
  } catch (error) {
    logger.error("Schema visualization failed", { error });
    if (error instanceof Error && error.message === "DATABASE_NOT_CONNECTED") {
      return { nodes: [], edges: [], error: "No database connected. Please connect a database first." };
    }
    return {
      nodes: [],
      edges: [],
      error: error instanceof Error ? error.message : "Failed to visualize schema",
    };
  }
}

/**
 * Fetch data from dynamically connected database
 */
export async function fetchDynamicBusinessData(
  tableName: string,
  limit?: number
): Promise<FetchBusinessDataResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { status: "denied", message: "Unauthorized" };
  }

  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const { DynamicDbService } = await import("@/server/db/dynamic-db");
  const service = new DynamicDbService(session.user.id);

  try {
    await service.connect();

    const safeLimit = toSafeLimit(limit);
    const data = (await service.executeQuery(tableName, safeLimit)) || [];
    const sanitized = Array.isArray(data)
      ? data.map((row) => sanitizeForClient(row)) as any[]
      : [];

    logger.info("Fetched dynamic business data", {
      tableName,
      count: sanitized.length,
    });

    return {
      status: "ok",
      entity: tableName as any,
      data: sanitized as any,
    };
  } catch (error) {
    console.error("Data fetch failed:", error);
    if (error instanceof Error && error.message === "DATABASE_NOT_CONNECTED") {
      return { status: "error", message: "No database connected. Please connect a database first." };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to fetch data",
    };
  }
}

export type ManageDataResult =
  | DeniedResult
  | {
    status: "pending_confirmation";
    actionSummary: string;
    isOpen: boolean;
    model: string;
    action: string;
    id: string;
    message?: string;
  }
  | {
    status: "success";
    message: string;
    data?: any;
  }
  | {
    status: "error";
    message: string;
  };

export async function manageData(
  model: string,
  action: "delete" | "update",
  id: string,
  data?: any,
  confirmed: boolean = false
): Promise<ManageDataResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { status: "denied", message: "Unauthorized" };
  }

  // If not confirmed (or explicit false), return the UI prompt
  if (!confirmed) {
    return {
      status: "pending_confirmation",
      isOpen: true,
      actionSummary: `${action.toUpperCase()} on ${model} (ID: ${id})`,
      model,
      action,
      id
    };
  }
  // ...

  // Execution Phase
  try {
    const { DynamicDbService } = await import("@/server/db/dynamic-db");
    const service = new DynamicDbService(session.user.id);
    await service.connect();

    const result = await service.executeMutation(model, action, id, data);

    if (result.success) {
      logger.info(`Data mutation executed: ${action} on ${model} ${id}`);
      return {
        status: "success",
        message: `Successfully executed ${action} on ${model} ${id}.`,
        data: result
      };
    } else {
      return {
        status: "error",
        message: result.message || "Operation failed"
      };
    }
  } catch (error) {
    logger.error("Manage data failed", { error, model, id, action });
    return {
      status: "error",
      message: error instanceof Error ? error.message : "System Error during mutation"
    };
  }
}
