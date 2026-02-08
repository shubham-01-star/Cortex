import { PrismaClient } from "@prisma/client";
import { config } from "@/lib/config";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: config.isProd ? ["error"] : ["query", "error", "warn"],
  });

if (!config.isProd) globalForPrisma.prisma = prisma;
