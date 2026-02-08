import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUsers() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            name: true,
        },
    });

    console.log("Current users:");
    console.table(users);

    await prisma.$disconnect();
}

checkUsers();
