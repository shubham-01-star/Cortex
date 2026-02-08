import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { auth } from '@/server/auth/auth';
import { headers } from 'next/headers';

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ hasConnection: false });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { invitedById: true }
        });

        const effectiveUserId = user?.invitedById || session.user.id;

        // Check if any active DB connection exists for this user (or their inviter)
        const dbConfig = await prisma.dbConfig.findFirst({
            where: { userId: effectiveUserId, isActive: true },
        });

        return NextResponse.json({ hasConnection: !!dbConfig });
    } catch (error) {
        console.error('DB check error:', error);
        return NextResponse.json({ hasConnection: false });
    }
}
