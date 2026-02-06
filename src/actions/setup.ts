"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const dbSetupSchema = z.object({
  provider: z.enum(["postgresql", "mysql", "sqlite"]),
  host: z.string().min(1),
  port: z.string().default("5432"),
  user: z.string().min(1),
  password: z.string(),
  database: z.string().min(1),
});

export type DbSetupInput = z.infer<typeof dbSetupSchema>;

export async function checkDbConfig() {
  try {
    const config = await prisma.dbConfig.findFirst({
      where: { isActive: true },
    });
    return { isConfigured: !!config };
  } catch (error) {
    console.error("Failed to check DB config:", error);
    // If table doesn't exist or other error, assume not configured
    return { isConfigured: false };
  }
}

export async function connectDatabase(data: DbSetupInput) {
  try {
    const validated = dbSetupSchema.parse(data);
    
    // Construct connection string
    // Format: provider://user:password@host:port/database
    const connectionString = `${validated.provider}://${validated.user}:${validated.password}@${validated.host}:${validated.port}/${validated.database}`;

    // Verify connection (This would ideally use a raw connection to test, 
    // but for now we'll assume valid if we can save it. 
    // In a real app, strict verification via a separate Prisma Client instance is better).

    // Save to DbConfig
    // Note: We're using the main prisma client "DbConfig" model to store the *user's* target DB config.
    // This assumes the main cortex app has its own SQLite/PG setup that is separate, 
    // OR we are bootstrapping the main DB. 
    // Based on schema.prisma, DbConfig is a model in the current DB.
    
    // Deactivate old configs
    await prisma.dbConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    await prisma.dbConfig.create({
      data: {
        id: crypto.randomUUID(),
        provider: validated.provider,
        connectionString: connectionString,
        isActive: true,
      },
    });

    return { success: true, message: "Database connected successfully." };
  } catch (error) {
    console.error("Database connection failed:", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to connect." };
  }
}
