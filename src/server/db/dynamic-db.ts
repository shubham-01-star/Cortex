// NO "use server" - this is a utility class, not a server action
import { Pool as PgPool } from "pg";
import * as mysql from "mysql2/promise";
import { prisma } from "./prisma";
import mockData from "../data/mock-db-data.json";

type DbProvider = "postgresql" | "mysql" | "mock";

interface TableInfo {
    tableName: string;
    columns: Array<{ name: string; type: string }>;
}

interface ForeignKey {
    table: string;
    column: string;
    referencedTable: string;
    referencedColumn: string;
}

interface SchemaCache {
    tables: TableInfo[];
    foreignKeys: ForeignKey[];
    timestamp: number;
}

// 🔥 Connection Pool Cache (per user-provider)
const poolCache = new Map<string, PgPool | mysql.Pool | boolean>();
const schemaCache = new Map<string, SchemaCache>();
const SCHEMA_CACHE_TTL = 60000; // 60 seconds

export class DynamicDbService {
    private userId: string;
    private provider: DbProvider | null = null;
    private connection: PgPool | mysql.Pool | boolean | null = null;
    private mockData: any = null;

    constructor(userId: string) {
        this.userId = userId;
    }

    async connect() {
        // Resolve effective user ID (support for invited users)
        const user = await prisma.user.findUnique({
            where: { id: this.userId },
            select: { invitedById: true }
        });

        const effectiveUserId = (user as any)?.invitedById || this.userId;

        // Get active config for user (or inviter)
        const config = await prisma.dbConfig.findFirst({
            where: { userId: effectiveUserId, isActive: true } as any,
        });

        if (!config) {
            console.error(`[DynamicDbService] No active config found for user ${this.userId}`);
            throw new Error("DATABASE_NOT_CONNECTED");
        }

        // Detect Mock Provider via connection string convention
        if (config.connectionString && config.connectionString.startsWith("mock://")) {
            this.provider = "mock";
            this.mockData = mockData;
        } else {
            this.provider = config.provider as DbProvider;
        }

        console.log(`[DynamicDbService] Connecting to ${this.provider} for user ${this.userId}`);

        // Pool cache key with provider for multi-DB support
        const cacheKey = `${this.userId}-${this.provider}`;

        // Use cached pool if available
        if (poolCache.has(cacheKey)) {
            this.connection = poolCache.get(cacheKey)!;
            return;
        }

        if (this.provider === "postgresql") {
            this.connection = new PgPool({
                connectionString: config.connectionString,
                max: 5, // Prevent pool growth
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });
        } else if (this.provider === "mysql") {
            this.connection = mysql.createPool({
                uri: config.connectionString,
                connectionLimit: 5,
            });
        } else if (this.provider === "mock") {
            this.connection = true; // Just a flag
        }

        // Cache the pool with provider-aware key
        poolCache.set(cacheKey, this.connection!);
    }

    async getTables(): Promise<TableInfo[]> {
        if (!this.connection) throw new Error("DATABASE_NOT_CONNECTED");

        // Schema cache key with provider
        const cacheKey = `${this.userId}-${this.provider}`;
        const cached = schemaCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < SCHEMA_CACHE_TTL) {
            return cached.tables;
        }

        let tables: TableInfo[] = [];

        if (this.provider === "postgresql") {
            tables = await this.getPostgresTables();
        } else if (this.provider === "mysql") {
            tables = await this.getMySQLTables();
        } else if (this.provider === "mock") {
            // Mock Schema Logic
            if (this.mockData && this.mockData.schemas && this.mockData.schemas.default) {
                tables = (this.mockData.schemas.default as any[]).map(t => ({
                    tableName: t.tableName,
                    columns: t.columns
                }));
            }
        }

        // Unified cache update (fetch FKs together)
        let realForeignKeys: ForeignKey[] = [];

        if (this.provider === "postgresql") {
            realForeignKeys = await this.getPostgresForeignKeys();
        } else if (this.provider === "mysql") {
            realForeignKeys = await this.getMySQLForeignKeys();
        }

        // MERGE WITH INFERRED KEYS
        const inferredKeys = this.inferForeignKeys(tables);

        // Simple deduplication (prefer real keys)
        const realKeySet = new Set(realForeignKeys.map(k => `${k.table}.${k.column}`));
        const finalForeignKeys = [
            ...realForeignKeys,
            ...inferredKeys.filter(k => !realKeySet.has(`${k.table}.${k.column}`))
        ];

        schemaCache.set(cacheKey, { tables, foreignKeys: finalForeignKeys, timestamp: Date.now() });

        return tables;
    }

    async getForeignKeys(): Promise<ForeignKey[]> {
        if (!this.connection) throw new Error("DATABASE_NOT_CONNECTED");

        // Schema cache key with provider
        const cacheKey = `${this.userId}-${this.provider}`;
        const cached = schemaCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < SCHEMA_CACHE_TTL) {
            return cached.foreignKeys;
        }

        // If not cached, getTables() will populate it
        await this.getTables();

        const refreshed = schemaCache.get(cacheKey);
        return refreshed?.foreignKeys || [];
    }

    // Table name validation to prevent SQL injection
    async executeQuery(tableName: string, limit: number = 10) {
        if (!this.connection) throw new Error("DATABASE_NOT_CONNECTED");

        // Safe limit guard
        limit = Math.min(limit ?? 10, 100);

        // Validate table name exists
        // Validate table name exists
        const tables = await this.getTables();

        // 1. Exact Match (Case-Insensitive)
        let targetTable = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());

        // 2. Fuzzy Match (Plural/Singular)
        if (!targetTable) {
            const lower = tableName.toLowerCase();
            const candidates = [
                lower + "s",       // user -> users
                lower.slice(0, -1) // users -> user
            ];
            targetTable = tables.find(t => candidates.includes(t.tableName.toLowerCase()));
        }

        if (!targetTable) {
            const available = tables.map(t => t.tableName).join(", ");
            console.error(`[DynamicDbService] Table mismatch. Requested: '${tableName}', Available: [${available}]`);
            throw new Error(`Invalid table: '${tableName}'. Available tables: ${available}`);
        }

        // Sanitize table identifier
        const safeTable = targetTable.tableName; // Use canonical name
        const sanitizedTable = safeTable.replace(/"/g, "").replace(/`/g, "");

        // Provider-aware LIMIT syntax
        if (this.provider === "postgresql") {
            // Postgres safe: LIMIT $1
            const sql = `SELECT * FROM "${sanitizedTable}" LIMIT $1`;
            const result = await (this.connection as PgPool).query(sql, [limit]);
            return result.rows;
        } else if (this.provider === "mysql") {
            // MySQL: Use parameterized query for LIMIT
            const sql = `SELECT * FROM ?? LIMIT ?`;
            const [rows] = await (this.connection as mysql.Pool).query(sql, [sanitizedTable, limit]);
            return rows as any[];
        } else if (this.provider === "mock") {
            // Mock Data Query
            // Match table name to keys in mockData (e.g. "users", "orders")
            const key = Object.keys(this.mockData).find(k => k.toLowerCase() === safeTable.toLowerCase() || k.toLowerCase() === safeTable.toLowerCase() + "s");

            if (key && Array.isArray(this.mockData[key])) {
                return this.mockData[key].slice(0, limit);
            }
            return [];
        }

        // Default empty for unknown provider (should not happen due to connection validation)
        return [];
    }

    async executeMutation(model: string, action: "delete" | "update", id: string | number, data?: any) {
        if (!this.connection) throw new Error("DATABASE_NOT_CONNECTED");

        // Validate table exists
        const tables = await this.getTables();
        const targetTable = tables.find(t => t.tableName.toLowerCase() === model.toLowerCase());
        if (!targetTable) throw new Error(`Invalid model/table: ${model}`);

        const tableName = targetTable.tableName.replace(/"/g, "").replace(/`/g, "");

        if (this.provider === "postgresql") {
            if (action === "delete") {
                const sql = `DELETE FROM "${tableName}" WHERE id = $1 RETURNING id`;
                const result = await (this.connection as PgPool).query(sql, [id]);
                return result.rowCount ? { success: true, count: result.rowCount } : { success: false, message: "Record not found" };
            } else if (action === "update" && data) {
                // Simplified update: Assuming data is a flat object
                // keys = ["name", "email"], values = ["Bob", "bob@example.com"]
                const keys = Object.keys(data);
                if (keys.length === 0) return { success: false, message: "No data to update" };

                const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
                const sql = `UPDATE "${tableName}" SET ${setClause} WHERE id = $1 RETURNING id`;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = await (this.connection as PgPool).query(sql, [id, ...Object.values(data) as any[]]);
                return result.rowCount ? { success: true, count: result.rowCount } : { success: false, message: "Record not found or no change" };
            }
        } else if (this.provider === "mysql") {
            if (action === "delete") {
                const sql = `DELETE FROM ?? WHERE id = ?`;
                const [result] = await (this.connection as mysql.Pool).query(sql, [tableName, id]);
                return (result as any).affectedRows ? { success: true } : { success: false, message: "Record not found" };
            } else if (action === "update" && data) {
                const sql = `UPDATE ?? SET ? WHERE id = ?`;
                const [result] = await (this.connection as mysql.Pool).query(sql, [tableName, data, id]);
                return (result as any).affectedRows ? { success: true } : { success: false, message: "Record not found" };
            }
        } else if (this.provider === "mock") {
            return { success: true, message: "Mock mutation simulation successful" };
        }

        throw new Error(`Unsupported provider or action: ${this.provider} / ${action}`);
    }

    async getSchemaGraph() {
        const tables = await this.getTables();
        const foreignKeys = await this.getForeignKeys();

        const safeTables = Array.isArray(tables) ? tables : [];
        const safeForeignKeys = Array.isArray(foreignKeys) ? foreignKeys : [];

        const nodes = safeTables.map((t, idx) => ({
            id: String(t?.tableName || `table-${idx}`),
            type: "tableNode",
            // basic grid layout if not handled by caller
            position: { x: (idx % 3) * 300, y: Math.floor(idx / 3) * 250 },
            data: {
                label: String(t?.tableName || "Unknown"),
                fields: (t?.columns || []).map(c => ({
                    name: String(c?.name || "unnamed"),
                    type: String(c?.type || "unknown"),
                    isId: Boolean(c?.name?.toLowerCase() === 'id')
                }))
            }
        }));

        const edges = safeForeignKeys.map((fk, i) => ({
            id: `${fk.table}-${fk.column}-${fk.referencedTable}-${i}`,
            source: String(fk.table),
            target: String(fk.referencedTable),
            label: `${fk.column} -> ${fk.referencedColumn}`
        }));

        return { nodes, edges };
    }

    private async getPostgresTables(): Promise<TableInfo[]> {
        const sql = `
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;

        const result = await (this.connection as PgPool).query(sql);
        return this.groupByTable(result.rows);
    }

    private async getMySQLTables(): Promise<TableInfo[]> {
        const sql = `
      SELECT 
        TABLE_NAME as table_name,
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      ORDER BY table_name, ordinal_position
    `;

        const [rows] = await (this.connection as mysql.Pool).execute(sql);
        return this.groupByTable(rows as any[]);
    }

    private async getPostgresForeignKeys(): Promise<ForeignKey[]> {
        try {
            const sql = `
          SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
        `;

            const result = await (this.connection as PgPool).query(sql);
            const realKeys = result.rows.map((row) => ({
                table: row.table_name,
                column: row.column_name,
                referencedTable: row.foreign_table_name,
                referencedColumn: row.foreign_column_name,
            }));

            return realKeys;
        } catch (error) {
            console.error("[DynamicDbService] Postgres FK fetch failed:", error);
            return [];
        }
    }

    private async getMySQLForeignKeys(): Promise<ForeignKey[]> {
        try {
            const sql = `
          SELECT
            TABLE_NAME as table_name,
            COLUMN_NAME as column_name,
            REFERENCED_TABLE_NAME as foreign_table_name,
            REFERENCED_COLUMN_NAME as foreign_column_name
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE REFERENCED_TABLE_NAME IS NOT NULL
            AND TABLE_SCHEMA = DATABASE()
        `;

            const [rows] = await (this.connection as mysql.Pool).execute(sql);
            return (rows as any[]).map((row) => ({
                table: row.table_name,
                column: row.column_name,
                referencedTable: row.foreign_table_name,
                referencedColumn: row.foreign_column_name,
            }));
        } catch (error) {
            console.error("[DynamicDbService] MySQL FK fetch failed:", error);
            return [];
        }
    }

    private groupByTable(rows: any[]): TableInfo[] {
        const tables = new Map<string, TableInfo>();

        for (const row of rows) {
            const tableName = row.table_name;
            if (!tables.has(tableName)) {
                tables.set(tableName, { tableName, columns: [] });
            }
            tables.get(tableName)!.columns.push({
                name: row.column_name,
                type: row.data_type,
            });
        }

        return Array.from(tables.values());
    }

    /**
     * Infer foreign keys based on column names (e.g. user_id -> users.id)
     */
    private inferForeignKeys(tables: TableInfo[]): ForeignKey[] {
        const inferred: ForeignKey[] = [];
        const tableNames = new Set(tables.map(t => t.tableName));

        for (const table of tables) {
            for (const col of table.columns) {
                // Remove type casting if not strictly needed or handle casing
                const colName = col.name;

                if (colName.endsWith("_id")) {
                    // Try to guess target table
                    const baseName = colName.slice(0, -3); // e.g. "user" from "user_id"

                    // Possible target names: "user", "users", "User", "Users"
                    const candidates = [
                        baseName,
                        baseName + "s",
                        baseName.charAt(0).toUpperCase() + baseName.slice(1),
                        baseName.charAt(0).toUpperCase() + baseName.slice(1) + "s",
                        "Users", "Orders", "Customers" // Common fallbacks
                    ];

                    const targetTable = candidates.find(c => tableNames.has(c));

                    if (targetTable) {
                        inferred.push({
                            table: table.tableName,
                            column: colName,
                            referencedTable: targetTable,
                            referencedColumn: "id" // Assumption
                        });
                    }
                }
                // Handle "userId" style (no underscore) common in JS mocks
                else if (colName.endsWith("Id") && colName !== "id") {
                    const baseName = colName.slice(0, -2); // "user" from "userId"
                    const candidates = [
                        baseName + "s",
                        baseName.charAt(0).toUpperCase() + baseName.slice(1) + "s",
                        baseName.charAt(0).toUpperCase() + baseName.slice(1),
                        "Users", "Orders", "Customers"
                    ];
                    const targetTable = candidates.find(c => tableNames.has(c));
                    if (targetTable) {
                        inferred.push({
                            table: table.tableName,
                            column: colName,
                            referencedTable: targetTable,
                            referencedColumn: "id"
                        });
                    }
                }
            }
        }
        return inferred;
    }
}

// Explicit cache invalidation helper
export function clearUserDbCache(userId: string) {
    // Clear all pools for this user (any provider)
    for (const key of poolCache.keys()) {
        if (key.startsWith(userId)) {
            const pool = poolCache.get(key);
            if (pool) {
                // Close the pool before removing if it's a real pool
                if (typeof pool === 'object' && pool !== null && "end" in pool) {
                    (pool as any).end().catch(console.error);
                }
            }
            poolCache.delete(key);
        }
    }
    // Clear schema cache
    for (const key of schemaCache.keys()) {
        if (key.startsWith(userId)) {
            schemaCache.delete(key);
        }
    }
}
