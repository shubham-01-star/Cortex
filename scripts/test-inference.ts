
// Mock types needed for the test
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

// The logic copied from DynamicDbService for testing
function inferForeignKeys(tables: TableInfo[]): ForeignKey[] {
    const inferred: ForeignKey[] = [];
    const tableNames = new Set(tables.map(t => t.tableName));

    for (const table of tables) {
        for (const col of table.columns) {
            if (col.name.endsWith("_id")) {
                // Try to guess target table
                const baseName = col.name.slice(0, -3); // e.g. "user" from "user_id"

                // Possible target names: "user", "users", "User", "Users"
                const candidates = [
                    baseName,
                    baseName + "s",
                    baseName.charAt(0).toUpperCase() + baseName.slice(1),
                    baseName.charAt(0).toUpperCase() + baseName.slice(1) + "s"
                ];

                const targetTable = candidates.find(c => tableNames.has(c));

                if (targetTable) {
                    inferred.push({
                        table: table.tableName,
                        column: col.name,
                        referencedTable: targetTable,
                        referencedColumn: "id" // Assumption
                    });
                }
            }
        }
    }
    return inferred;
}

// Mock Data
const mockTables: TableInfo[] = [
    {
        tableName: "users",
        columns: [
            { name: "id", type: "int" },
            { name: "name", type: "varchar" }
        ]
    },
    {
        tableName: "connected_emails",
        columns: [
            { name: "id", type: "int" },
            { name: "user_id", type: "int" }, // Should infer -> users.id
            { name: "email", type: "varchar" }
        ]
    },
    {
        tableName: "processed_emails",
        columns: [
            { name: "id", type: "int" },
            { name: "connected_email_id", type: "int" }, // Should infer -> connected_emails.id
            { name: "subject", type: "text" }
        ]
    }
];

// Run Test
console.log("Running Inference Test...");
const results = inferForeignKeys(mockTables);
console.log("Inferred Keys:", JSON.stringify(results, null, 2));

// Checks
if (results.length !== 2) {
    console.error("FAILED: Expected 2 inferred keys, got " + results.length);
    process.exit(1);
}

const u_id = results.find(k => k.column === "user_id");
if (u_id?.referencedTable !== "users") {
    console.error("FAILED: user_id did not link to users");
    process.exit(1);
}

const ce_id = results.find(k => k.column === "connected_email_id");
if (ce_id?.referencedTable !== "connected_emails") {
    console.error("FAILED: connected_email_id did not link to connected_emails");
    process.exit(1);
}

console.log("SUCCESS: Logic verification passed!");
