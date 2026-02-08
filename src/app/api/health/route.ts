import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Check DB connection
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json({
            status: "online",
            timestamp: new Date().toISOString(),
            database: "connected",
            uptime: process.uptime(),
        });
    } catch (error) {
        return NextResponse.json({
            status: "degraded",
            database: "disconnected",
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 503 });
    }
}
