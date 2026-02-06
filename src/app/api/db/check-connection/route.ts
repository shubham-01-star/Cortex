import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Check if any active DB connection exists
        const dbConfig = await prisma.dbConfig.findFirst({
            where: { isActive: true },
        });

        return NextResponse.json({ hasConnection: !!dbConfig });
    } catch (error) {
        console.error('DB check error:', error);
        return NextResponse.json({ hasConnection: false });
    }
}
