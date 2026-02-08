
import { PrismaClient } from "@prisma/client";
import { DynamicDbService } from "../src/server/db/dynamic-db";

const prisma = new PrismaClient();

async function main() {
    console.log("🧪 Starting Dynamic DB Verification...");

    // 1. Create/Get Test User
    const user = await prisma.user.upsert({
        where: { email: "verifier@cortex.ai" },
        update: {},
        create: {
            id: "verifier-user-id",
            email: "verifier@cortex.ai",
            name: "Verifier Bot",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
    console.log(`✅ Test User Ready: ${user.id}`);

    // 2. Simulate "Connecting Database" (connecting to SELF/Local DB for test)
    // We grab the DATABASE_URL from env or default
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL missing");

    // Upsert DbConfig
    await prisma.dbConfig.upsert({
        where: { id: "verify-config-id" }, // We need a unique ID or composite check
        update: {
            userId: user.id,
            provider: "postgresql",
            connectionString: dbUrl,
            maskedConnectionString: "postgres://verifier:***",
            isActive: true
        },
        create: {
            id: "verify-config-id",
            userId: user.id,
            connectionString: dbUrl,
            maskedConnectionString: "postgres://verifier:***",
            provider: "postgresql",
            isActive: true
        }
    });
    console.log("✅ DbConfig Saved (Simulating user connection)");

    // 3. Test Dynamic Service
    const service = new DynamicDbService(user.id);

    try {
        console.log("🔄 Connecting Service...");
        await service.connect();
        console.log("✅ Service Connected");

        console.log("🔄 Fetching Tables...");
        const tables = await service.getTables();
        console.log(`✅ Found ${tables.length} tables:`, tables.map(t => t.tableName).join(", "));

        if (tables.length > 0) {
            const target = "User"; // Testing PascalCase input against lowercase 'user' table
            console.log(`🔄 Querying table '${target}'...`);
            const rows = await service.executeQuery(target, 5);
            console.log(`✅ Query Success! Retrieved ${rows.length} rows.`);
            console.log("Sample Row:", rows[0] ? JSON.stringify(rows[0]).substring(0, 100) + "..." : "Empty");
        }

        console.log("\n🎉 DYNAMIC DB VERIFICATION PASSED!");

    } catch (err) {
        console.error("\n❌ VERIFICATION FAILED:", err);
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
