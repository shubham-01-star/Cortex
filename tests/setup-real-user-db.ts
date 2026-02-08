import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupRealUserDb() {
    console.log("\n🔧 Setting up DB config for test@123.com");

    const user = await prisma.user.findFirst({
        where: { email: "test@123.com" },
    });

    if (!user) {
        console.error("❌ User not found");
        process.exit(1);
    }

    const connectionString = "mysql://n8nuser:Password@123@localhost:3306/n8n";
    const maskedConnectionString = "mysql://n8nuser:****@localhost:3306/n8n";

    // Deactivate old configs
    await prisma.dbConfig.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
    });

    // Create new config
    const config = await prisma.dbConfig.create({
        data: {
            id: `db-config-${user.id}`,
            userId: user.id,
            provider: "mysql",
            connectionString,
            maskedConnectionString,
            isActive: true,
        } as any,
    });

    console.log("✅ DB config created:", config.id);
    console.log("   Provider:", config.provider);
    console.log("   Active:", config.isActive);

    await prisma.$disconnect();
}

setupRealUserDb();
