/**
 * Test script for Dynamic Database Engine
 * Run with: npx tsx tests/test-dynamic-db.ts
 */

import { PrismaClient } from "@prisma/client";
import * as mysql from "mysql2/promise";

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

async function testMySQLConnection() {
    console.log("\n🔍 Test 1: MySQL Connection Test");
    console.log("=".repeat(50));

    const connectionString = `mysql://${TEST_CONFIG.user}:${TEST_CONFIG.password}@${TEST_CONFIG.host}:${TEST_CONFIG.port}/${TEST_CONFIG.database}`;

    try {
        const pool = mysql.createPool({
            uri: connectionString,
            connectionLimit: 5,
        });

        const [result] = await pool.execute("SELECT 1 as test");
        console.log("✅ Connection successful:", result);

        await pool.end();
        return true;
    } catch (error) {
        console.error("❌ Connection failed:", error);
        return false;
    }
}

async function testSchemaFetch() {
    console.log("\n🔍 Test 2: Schema Fetch Test");
    console.log("=".repeat(50));

    const connectionString = `mysql://${TEST_CONFIG.user}:${TEST_CONFIG.password}@${TEST_CONFIG.host}:${TEST_CONFIG.port}/${TEST_CONFIG.database}`;

    try {
        const pool = mysql.createPool({
            uri: connectionString,
            connectionLimit: 5,
        });

        // Test table fetch
        const sql = `
      SELECT 
        TABLE_NAME as table_name,
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      ORDER BY table_name, ordinal_position
      LIMIT 20
    `;

        const [rows] = await pool.execute(sql);
        console.log("✅ Schema fetch successful");
        console.log("📊 Sample rows:", JSON.stringify(rows, null, 2));

        // Group by table
        const tables = new Map();
        for (const row of rows as any[]) {
            const tableName = row.table_name;
            if (!tables.has(tableName)) {
                tables.set(tableName, { tableName, columns: [] });
            }
            tables.get(tableName).columns.push({
                name: row.column_name,
                type: row.data_type,
            });
        }

        console.log("\n📋 Grouped tables:");
        for (const [name, table] of tables.entries()) {
            console.log(`  - ${name}: ${(table as any).columns.length} columns`);
        }

        await pool.end();
        return true;
    } catch (error) {
        console.error("❌ Schema fetch failed:", error);
        return false;
    }
}

async function testForeignKeys() {
    console.log("\n🔍 Test 3: Foreign Keys Test");
    console.log("=".repeat(50));

    const connectionString = `mysql://${TEST_CONFIG.user}:${TEST_CONFIG.password}@${TEST_CONFIG.host}:${TEST_CONFIG.port}/${TEST_CONFIG.database}`;

    try {
        const pool = mysql.createPool({
            uri: connectionString,
            connectionLimit: 5,
        });

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

        const [rows] = await pool.execute(sql);
        console.log("✅ Foreign keys fetch successful");
        console.log(`📊 Found ${(rows as any[]).length} foreign key relationships`);

        if ((rows as any[]).length > 0) {
            console.log("Sample FK:", JSON.stringify((rows as any[])[0], null, 2));
        }

        await pool.end();
        return true;
    } catch (error) {
        console.error("❌ Foreign keys fetch failed:", error);
        return false;
    }
}

async function testDataFetch() {
    console.log("\n🔍 Test 4: Data Fetch Test");
    console.log("=".repeat(50));

    const connectionString = `mysql://${TEST_CONFIG.user}:${TEST_CONFIG.password}@${TEST_CONFIG.host}:${TEST_CONFIG.port}/${TEST_CONFIG.database}`;

    try {
        const pool = mysql.createPool({
            uri: connectionString,
            connectionLimit: 5,
        });

        const tableName = "users";
        const limit = 5;
        const sql = `SELECT * FROM \`${tableName}\` LIMIT ?`;

        const [rows] = await pool.execute(sql, [limit]);
        console.log("✅ Data fetch successful");
        console.log(`📊 Fetched ${(rows as any[]).length} rows from '${tableName}'`);

        if ((rows as any[]).length > 0) {
            console.log("Sample row:", JSON.stringify((rows as any[])[0], null, 2));
        }

        await pool.end();
        return true;
    } catch (error) {
        console.error("❌ Data fetch failed:", error);
        return false;
    }
}

async function testDynamicDbService() {
    console.log("\n🔍 Test 5: DynamicDbService Integration Test");
    console.log("=".repeat(50));

    try {
        // Create a test user in Prisma
        const testUser = await prisma.user.upsert({
            where: { email: "test@cortex.dev" },
            update: {},
            create: {
                id: "test-user-123",
                email: "test@cortex.dev",
                name: "Test User",
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        console.log("✅ Test user created:", testUser.id);

        // Create a test DB config
        const connectionString = `mysql://${TEST_CONFIG.user}:${TEST_CONFIG.password}@${TEST_CONFIG.host}:${TEST_CONFIG.port}/${TEST_CONFIG.database}`;

        const dbConfig = await prisma.dbConfig.upsert({
            where: { id: "test-config-123" },
            update: {
                isActive: true,
                connectionString,
            } as any,
            create: {
                id: "test-config-123",
                userId: testUser.id,
                provider: "mysql",
                connectionString,
                isActive: true,
            } as any,
        });

        console.log("✅ Test DB config created:", dbConfig.id);

        // Now test DynamicDbService
        const { DynamicDbService } = await import("../src/server/db/dynamic-db");
        const service = new DynamicDbService(testUser.id);

        await service.connect();
        console.log("✅ DynamicDbService connected");

        const tables = await service.getTables();
        console.log(`✅ Fetched ${tables.length} tables`);
        console.log("Tables:", tables.map((t) => t.tableName).join(", "));

        if (tables.length > 0) {
            console.log("\nFirst table details:");
            console.log(JSON.stringify(tables[0], null, 2));
        }

        const foreignKeys = await service.getForeignKeys();
        console.log(`✅ Fetched ${foreignKeys.length} foreign keys`);

        // Test data fetch
        if (tables.length > 0) {
            const firstTable = tables[0].tableName;
            const data = await service.executeQuery(firstTable, 3);
            console.log(`✅ Fetched ${data.length} rows from '${firstTable}'`);
        }

        // Cleanup
        await prisma.dbConfig.delete({ where: { id: "test-config-123" } });
        await prisma.user.delete({ where: { id: "test-user-123" } });
        console.log("✅ Cleanup complete");

        return true;
    } catch (error) {
        console.error("❌ DynamicDbService test failed:", error);
        return false;
    }
}

async function runAllTests() {
    console.log("\n🚀 Starting Dynamic Database Engine Tests");
    console.log("=".repeat(50));

    const results = {
        connection: await testMySQLConnection(),
        schema: await testSchemaFetch(),
        foreignKeys: await testForeignKeys(),
        dataFetch: await testDataFetch(),
        integration: await testDynamicDbService(),
    };

    console.log("\n📊 Test Results Summary");
    console.log("=".repeat(50));
    console.log(`Connection Test:     ${results.connection ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Schema Fetch Test:   ${results.schema ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Foreign Keys Test:   ${results.foreignKeys ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Data Fetch Test:     ${results.dataFetch ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Integration Test:    ${results.integration ? "✅ PASS" : "❌ FAIL"}`);

    const allPassed = Object.values(results).every((r) => r);
    console.log("\n" + "=".repeat(50));
    console.log(allPassed ? "🎉 ALL TESTS PASSED!" : "⚠️  SOME TESTS FAILED");
    console.log("=".repeat(50) + "\n");

    await prisma.$disconnect();
    process.exit(allPassed ? 0 : 1);
}

runAllTests().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
