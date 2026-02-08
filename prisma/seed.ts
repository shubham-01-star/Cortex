import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Re-seeding database...');

    // Clear existing data (optional)
    await prisma.user.deleteMany({});
    await prisma.dbConfig.deleteMany({});
    await prisma.invitation.deleteMany({});

    // Create users with different roles
    // NOTE: BetterAuth needs 'emailVerified' and 'createdAt/updatedAt'
    await prisma.user.create({
        data: {
            id: 'user_admin',
            email: 'admin@cortex.dev',
            name: 'Admin User',
            role: 'admin',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            permissions: ["READ", "WRITE", "DELETE", "EXECUTE"]
        },
    });

    console.log('✅ Created Admin user');
    console.log('🎉 Seeding complete!');
    console.log('⚠️ IMPORTANT: The seeded admin user does not have a password account. Please use "Sign Up" in the app or manually create an account record.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
