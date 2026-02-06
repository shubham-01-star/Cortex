import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create users with different roles
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cortex.dev' },
        update: {},
        create: {
            id: 'user_admin',
            email: 'admin@cortex.dev',
            name: 'Admin User',
            role: 'ADMIN',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    const developer = await prisma.user.upsert({
        where: { email: 'dev@cortex.dev' },
        update: {},
        create: {
            id: 'user_dev',
            email: 'dev@cortex.dev',
            name: 'Developer User',
            role: 'DEVELOPER',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    const viewer = await prisma.user.upsert({
        where: { email: 'viewer@cortex.dev' },
        update: {},
        create: {
            id: 'user_viewer',
            email: 'viewer@cortex.dev',
            name: 'Viewer User',
            role: 'VIEWER',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    console.log('✅ Created users:', { admin: admin.email, developer: developer.email, viewer: viewer.email });

    // Create customers
    const customers = [];
    for (let i = 1; i <= 10; i++) {
        const customer = await prisma.customer.create({
            data: {
                id: `customer_${i}`,
                name: `Customer ${i}`,
                email: `customer${i}@example.com`,
            },
        });
        customers.push(customer);
    }
    console.log(`✅ Created ${customers.length} customers`);

    // Create orders
    const statuses = ['pending', 'processing', 'completed', 'cancelled'];
    for (let i = 1; i <= 50; i++) {
        await prisma.order.create({
            data: {
                id: `order_${i}`,
                amount: Math.random() * 1000 + 50,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                customerId: customers[Math.floor(Math.random() * customers.length)].id,
            },
        });
    }
    console.log('✅ Created 50 orders');

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
