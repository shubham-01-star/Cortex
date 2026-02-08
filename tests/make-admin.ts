import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function makeAdmin() {
    const updated = await prisma.user.update({
        where: { email: "test@123.com" },
        data: { role: "admin" },
    });

    console.log("✅ Updated user to admin:");
    console.table({
        email: updated.email,
        name: updated.name,
        role: updated.role,
    });

    await prisma.$disconnect();
}

makeAdmin();
