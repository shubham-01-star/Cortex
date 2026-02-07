import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseConnection() {
    try {
        console.log('🔍 [DB] Checking database connection...');

        // Simple query to test connection
        await prisma.$queryRaw`SELECT 1`;

        console.log('✅ [DB] Database connected successfully!');
        console.log(`📊 [DB] Connection URL: ${process.env.DATABASE_URL?.split('@')[1] || 'configured'}`);

    } catch (error) {
        console.error('❌ [DB] Database connection FAILED!');
        console.error('❌ [DB] Error:', error instanceof Error ? error.message : error);
        console.error('⚠️  [DB] Check your DATABASE_URL in .env file');
    } finally {
        await prisma.$disconnect();
    }
}

// Run on import
checkDatabaseConnection();

export { checkDatabaseConnection };
