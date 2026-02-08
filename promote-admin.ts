import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = "admin@test.com";

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: "admin" }
        });
        console.log(`✅ User ${email} promoted to ADMIN.`);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`❌ Failed to promote user: ${errorMessage}`);
        console.log("Make sure the user exists first (sign up via UI).");
    } finally {
        await prisma.$disconnect();
    }
}

main();
