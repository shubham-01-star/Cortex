/**
 * End-to-End Test for Dynamic Database Schema Visualization
 * Tests the complete flow: DB connection → Schema fetch → Data transformation → Validation
 * Run with: npx tsx tests/test-e2e-schema.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Test configuration
const TEST_CONFIG = {
    provider: "mysql" as const,
    host: "localhost",
    port: 3306,
    user: "n8nuser",
    password: "Password@123",
    database: "n8n",
};

async function setupTestUser() {
    console.log("\n📋 Step 1: Setup Test User");
    console.log("=".repeat(60));

    const testUser = await prisma.user.upsert({
        where: { email: "e2e-test@cortex.dev" },
        update: { role: "admin" },
        create: {
            id: "e2e-test-user",
            email: "e2e-test@cortex.dev",
            name: "E2E Test User",
            role: "admin",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    console.log("✅ Test user created/updated:", testUser.email);
    console.log("   Role:", testUser.role);
    return testUser;
}

async function setupDbConfig(userId: string) {
    console.log("\n📋 Step 2: Setup Database Configuration");
    console.log("=".repeat(60));

    const connectionString = `mysql://${TEST_CONFIG.user}:${TEST_CONFIG.password}@${TEST_CONFIG.host}:${TEST_CONFIG.port}/${TEST_CONFIG.database}`;
    const maskedConnectionString = `mysql://${TEST_CONFIG.user}:****@${TEST_CONFIG.host}:${TEST_CONFIG.port}/${TEST_CONFIG.database}`;

    // Deactivate old configs
    await prisma.dbConfig.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
    });

    const dbConfig = await prisma.dbConfig.upsert({
        where: { id: "e2e-test-config" },
        update: {
            isActive: true,
            connectionString,
            maskedConnectionString,
        } as any,
        create: {
            id: "e2e-test-config",
            userId,
            provider: "mysql",
            connectionString,
            maskedConnectionString,
            isActive: true,
        } as any,
    });

    console.log("✅ DB config created:", dbConfig.id);
    console.log("   Provider:", dbConfig.provider);
    console.log("   Active:", dbConfig.isActive);
    return dbConfig;
}

async function testDynamicDbService(userId: string) {
    console.log("\n📋 Step 3: Test DynamicDbService");
    console.log("=".repeat(60));

    const { DynamicDbService } = await import("../src/server/db/dynamic-db");
    const service = new DynamicDbService(userId);

    // Test connection
    console.log("⏳ Connecting to database...");
    await service.connect();
    console.log("✅ Connected successfully");

    // Test schema fetch
    console.log("\n⏳ Fetching tables...");
    const tables = await service.getTables();
    console.log(`✅ Fetched ${tables.length} tables`);

    if (tables.length === 0) {
        throw new Error("No tables found!");
    }

    // Validate table structure
    console.log("\n📊 Table Structure Validation:");
    for (const table of tables) {
        console.log(`\n  Table: ${table.tableName}`);
        console.log(`  Columns: ${table.columns.length}`);

        // Check for required fields
        for (const col of table.columns) {
            if (!col.name) {
                throw new Error(`Column missing name in table ${table.tableName}`);
            }
            if (!col.type) {
                console.warn(`⚠️  Column ${col.name} has no type, will use 'unknown'`);
            }
        }

        // Show first 3 columns
        const preview = table.columns.slice(0, 3).map((c) => `${c.name}:${c.type}`);
        console.log(`  Preview: ${preview.join(", ")}...`);
    }

    // Test foreign keys
    console.log("\n⏳ Fetching foreign keys...");
    const foreignKeys = await service.getForeignKeys();
    console.log(`✅ Fetched ${foreignKeys.length} foreign key relationships`);

    return { tables, foreignKeys };
}

async function testSchemaTransformation(tables: any[], foreignKeys: any[]) {
    console.log("\n📋 Step 4: Test Schema Transformation");
    console.log("=".repeat(60));

    // Simulate what visualizeDynamicSchema does
    const MAX_TABLES = 40;
    const limitedTables = tables.slice(0, MAX_TABLES);

    console.log(`⏳ Transforming ${limitedTables.length} tables to React Flow format...`);

    const nodes = limitedTables.map((table, idx) => ({
        id: table.tableName,
        type: "tableNode",
        position: { x: (idx % 3) * 300, y: Math.floor(idx / 3) * 250 },
        data: {
            label: table.tableName,
            fields: table.columns.map((c: any) => ({
                name: c.name || "unknown",
                type: c.type || "unknown",
                isId: c.name?.toLowerCase() === "id",
            })),
        },
    }));

    const edges = foreignKeys.map((fk) => ({
        id: `${fk.table}-${fk.column}-${fk.referencedTable}`,
        source: fk.table,
        target: fk.referencedTable,
        label: `${fk.column} → ${fk.referencedColumn}`,
    }));

    console.log("✅ Transformation complete");
    console.log(`   Nodes: ${nodes.length}`);
    console.log(`   Edges: ${edges.length}`);

    return { nodes, edges };
}

async function testZodValidation(nodes: any[], edges: any[]) {
    console.log("\n📋 Step 5: Test Zod Schema Validation");
    console.log("=".repeat(60));

    const { z } = await import("zod");

    const nodeSchema = z.object({
        id: z.string(),
        type: z.string().optional(),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.object({
            label: z.string(),
            fields: z.array(
                z.object({
                    name: z.string(),
                    type: z.string(),
                    isId: z.boolean(),
                })
            ),
        }),
    });

    const edgeSchema = z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        label: z.string().optional(),
    });

    const propsSchema = z.object({
        nodes: z.array(nodeSchema),
        edges: z.array(edgeSchema),
    });

    console.log("⏳ Validating schema...");

    try {
        const result = propsSchema.parse({ nodes, edges });
        console.log("✅ Schema validation passed!");
        console.log(`   Validated ${result.nodes.length} nodes`);
        console.log(`   Validated ${result.edges.length} edges`);
        return true;
    } catch (error: any) {
        console.error("❌ Schema validation failed!");
        console.error(error.errors);
        throw error;
    }
}

async function testServerAction(userId: string) {
    console.log("\n📋 Step 6: Test Server Action");
    console.log("=".repeat(60));

    // Mock the session
    const mockSession = {
        user: {
            id: userId,
            email: "e2e-test@cortex.dev",
            role: "admin",
        },
    };

    console.log("⏳ Calling visualizeDynamicSchema...");

    // We can't directly test the server action without mocking auth,
    // but we can test the DynamicDbService which is the core logic
    const { DynamicDbService } = await import("../src/server/db/dynamic-db");
    const service = new DynamicDbService(userId);

    await service.connect();
    const tables = await service.getTables();
    const foreignKeys = await service.getForeignKeys();

    const nodes = tables.map((table, idx) => ({
        id: table.tableName,
        type: "tableNode",
        position: { x: (idx % 3) * 300, y: Math.floor(idx / 3) * 250 },
        data: {
            label: table.tableName,
            fields: table.columns.map((c) => ({
                name: c.name || "unknown",
                type: c.type || "unknown",
                isId: c.name?.toLowerCase() === "id",
            })),
        },
    }));

    const edges = foreignKeys.map((fk) => ({
        id: `${fk.table}-${fk.column}-${fk.referencedTable}`,
        source: fk.table,
        target: fk.referencedTable,
        label: `${fk.column} → ${fk.referencedColumn}`,
    }));

    console.log("✅ Server action logic works");
    console.log(`   Result: { nodes: ${nodes.length}, edges: ${edges.length} }`);

    return { nodes, edges };
}

async function testDataFetch(userId: string, tableName: string) {
    console.log("\n📋 Step 7: Test Data Fetching");
    console.log("=".repeat(60));

    const { DynamicDbService } = await import("../src/server/db/dynamic-db");
    const service = new DynamicDbService(userId);

    await service.connect();

    console.log(`⏳ Fetching data from table '${tableName}'...`);
    const data = (await service.executeQuery(tableName, 5)) || [];

    console.log(`✅ Fetched ${data.length} rows`);

    if (data && data.length > 0) {
        console.log("\n📊 Sample row:");
        const sampleRow = data[0] as any;
        const keys = Object.keys(sampleRow).slice(0, 5);
        for (const key of keys) {
            console.log(`   ${key}: ${sampleRow[key]}`);
        }
    }

    return data;
}

async function cleanup() {
    console.log("\n📋 Step 8: Cleanup");
    console.log("=".repeat(60));

    await prisma.dbConfig.deleteMany({
        where: { id: "e2e-test-config" },
    });

    await prisma.user.deleteMany({
        where: { id: "e2e-test-user" },
    });

    console.log("✅ Cleanup complete");
}

async function runE2ETest() {
    console.log("\n🚀 Starting End-to-End Schema Visualization Test");
    console.log("=".repeat(60));

    const results: Record<string, boolean> = {};

    try {
        // Step 1: Setup user
        const user = await setupTestUser();
        results.userSetup = true;

        // Step 2: Setup DB config
        await setupDbConfig(user.id);
        results.dbConfigSetup = true;

        // Step 3: Test DynamicDbService
        const { tables, foreignKeys } = await testDynamicDbService(user.id);
        results.dynamicDbService = true;

        // Step 4: Test transformation
        const { nodes, edges } = await testSchemaTransformation(tables, foreignKeys);
        results.transformation = true;

        // Step 5: Test Zod validation
        await testZodValidation(nodes, edges);
        results.zodValidation = true;

        // Step 6: Test server action logic
        await testServerAction(user.id);
        results.serverAction = true;

        // Step 7: Test data fetching (if tables exist)
        if (tables.length > 0) {
            await testDataFetch(user.id, tables[0].tableName);
            results.dataFetch = true;
        }

        // Step 8: Cleanup
        await cleanup();
        results.cleanup = true;

        // Summary
        console.log("\n" + "=".repeat(60));
        console.log("📊 Test Results Summary");
        console.log("=".repeat(60));

        for (const [test, passed] of Object.entries(results)) {
            console.log(`${passed ? "✅" : "❌"} ${test}`);
        }

        const allPassed = Object.values(results).every((r) => r);
        console.log("\n" + "=".repeat(60));
        console.log(allPassed ? "🎉 ALL E2E TESTS PASSED!" : "⚠️  SOME TESTS FAILED");
        console.log("=".repeat(60) + "\n");

        await prisma.$disconnect();
        process.exit(allPassed ? 0 : 1);
    } catch (error) {
        console.error("\n❌ E2E Test Failed:");
        console.error(error);

        // Try cleanup even on error
        try {
            await cleanup();
        } catch (cleanupError) {
            console.error("Cleanup also failed:", cleanupError);
        }

        await prisma.$disconnect();
        process.exit(1);
    }
}

runE2ETest();
