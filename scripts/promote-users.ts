import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function promoteAllUsersToAdmin() {
    try {
        console.log('🔍 Finding all users...');
        const users = await prisma.user.findMany();
        console.log(`📊 Found ${users.length} users.`);

        if (users.length === 0) {
            console.log("No users found to update.");
            return;
        }

        console.log('🚀 Promoting all users to ADMIN...');
        const result = await prisma.user.updateMany({
            data: {
                role: 'admin'
            }
        });

        console.log(`✅ Successfully updated ${result.count} users to admin role.`);

    } catch (error) {
        console.error('❌ Error updating users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

promoteAllUsersToAdmin();
