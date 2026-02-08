"use server";

import { prisma } from "@/server/db/prisma";
import { auth } from "@/server/auth/auth";
import { headers } from "next/headers";
import { z } from "zod";

const connectionSchema = z.object({
    provider: z.string(),
    host: z.string().optional(),
    port: z.number().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    database: z.string().optional(), // Database is optional for mock
});

export type ConnectionInput = z.infer<typeof connectionSchema>;

/**
 * Checks if any database is configured and active for the current user.
 */
export async function checkConnection() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
        return { isConfigured: false };
    }

    try {
        const config = await prisma.dbConfig.findFirst({
            where: { userId: session.user.id, isActive: true } as any,
        });
        return { isConfigured: !!config, config };
    } catch (error) {
        console.error("Failed to check connection:", error);
        return { isConfigured: false };
    }
}

/**
 * Saves a new database configuration with connection test and cache invalidation.
 */
export async function saveConnection(data: ConnectionInput) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Handle Mock Provider
    if (data.provider === "mock") {
        try {
            // Deactivate old configs for THIS USER
            await prisma.dbConfig.updateMany({
                where: { userId: session.user.id, isActive: true },
                data: { isActive: false },
            });

            // Invalidate caches
            const { clearUserDbCache } = await import("@/server/db/dynamic-db");
            clearUserDbCache(session.user.id);

            // Create new config (Store as postgresql but with mock connection string)
            const config = await prisma.dbConfig.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: session.user.id,
                    provider: "postgresql", // Satisfies Prisma Enum
                    connectionString: "mock://cortex_simulation_db",
                    maskedConnectionString: "mock://Simulation_Mode",
                    isActive: true,
                },
            });

            return {
                success: true,
                message: "Mock Database Simulation Active",
                config,
            };
        } catch (error) {
            console.error("Mock setup failed:", error);
            return { success: false, message: "Failed to setup mock DB" };
        }
    }

    try {
        if (!data.database) throw new Error("Database name required");

        // Build real connection string
        const realConnectionString = `${data.provider}://${data.user}:${data.password}@${data.host}:${data.port || (data.provider === "postgresql" ? 5432 : 3306)}/${data.database}`;
        const maskedConnectionString = `${data.provider}://${data.user}:****@${data.host}:${data.port || (data.provider === "postgresql" ? 5432 : 3306)}/${data.database}`;

        // Test connection before saving
        if (data.provider === "postgresql") {
            const { Pool } = await import("pg");
            const testPool = new Pool({ connectionString: realConnectionString });
            await testPool.query("SELECT 1");
            await testPool.end();
        } else if (data.provider === "mysql") {
            const mysql = await import("mysql2/promise");
            const testPool = mysql.createPool(realConnectionString);
            await testPool.execute("SELECT 1");
            await testPool.end();
        }

        // Deactivate old configs for THIS USER
        await prisma.dbConfig.updateMany({
            where: { userId: session.user.id, isActive: true },
            data: { isActive: false },
        });

        // Invalidate caches on new connection
        const { clearUserDbCache } = await import("@/server/db/dynamic-db");
        clearUserDbCache(session.user.id);

        // Create new config
        const config = await prisma.dbConfig.create({
            data: {
                id: crypto.randomUUID(),
                userId: session.user.id,
                provider: data.provider as any,
                connectionString: realConnectionString,
                maskedConnectionString,
                isActive: true,
            },
        });

        return {
            success: true,
            message: "Database connected.",
            config,
        };
    } catch (error) {
        console.error("Connection test failed:", error);
        return {
            success: false,
            message: "Connection failed. Please check your credentials.",
        };
    }
}
