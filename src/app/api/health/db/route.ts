import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        console.log('🔍 [DB Health Check] Testing database connection...');

        await prisma.$queryRaw`SELECT 1`;

        const dbUrl = process.env.DATABASE_URL || '';
        const host = dbUrl.split('@')[1]?.split('/')[0] || 'configured';

        console.log('✅ [DB Health Check] Database connected successfully!');
        console.log(`📊 [DB Health Check] Host: ${host}`);

        return NextResponse.json({
            status: 'connected',
            host,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [DB Health Check] Database connection FAILED!');
        console.error('❌ [DB Health Check] Error:', error instanceof Error ? error.message : error);
        console.error('⚠️  [DB Health Check] Check your DATABASE_URL in .env file');

        return NextResponse.json({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });

    } finally {
        await prisma.$disconnect();
    }
}
