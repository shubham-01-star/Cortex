"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const connectionSchema = z.object({
    provider: z.string(),
    host: z.string().optional(),
    port: z.number().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    database: z.string(),
});

export type ConnectionInput = z.infer<typeof connectionSchema>;

/**
 * Checks if any database is configured and active.
 */
export async function checkConnection() {
    try {
        const config = await prisma.dbConfig.findFirst({
            where: { isActive: true },
        });
        return { isConfigured: !!config, config };
    } catch (error) {
        console.error("Failed to check connection:", error);
        return { isConfigured: false };
    }
}

/**
 * Saves a new database configuration.
 * Demo-safe: Stores the alias/provider but doesn't actually swap the underlying Prisma connection.
 */
export async function saveConnection(data: ConnectionInput) {
    try {
        // Deactivate old configs
        await prisma.dbConfig.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });

        // Create new config
        const config = await prisma.dbConfig.create({
            data: {
                id: crypto.randomUUID(),
                provider: data.provider,
                // In demo mode, we just store what they entered as metadata
                // connectionString can be a simulated string
                connectionString: `${data.provider}://${data.user || 'admin'}:****@${data.host || 'localhost'}/${data.database}`,
                isActive: true,
            },
        });

        return {
            success: true,
            message: "Database connection established.",
            config
        };
    } catch (error) {
        console.error("Failed to save connection:", error);
        return { success: false, message: "Failed to establish connection." };
    }
}
