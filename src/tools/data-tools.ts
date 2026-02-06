import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const fetchBusinessDataTool = {
  name: "fetch_business_data",
  description: "Fetches business data (customers, orders, etc.) from the database. Can filter and limit results.",
  inputSchema: z.object({
    model: z.enum(["Customer", "Order", "User"]).describe("The database table/model to query"),
    limit: z.number().optional().default(10).describe("Max number of records"),
    orderBy: z.string().optional().describe("Field to sort by"),
    orderDir: z.enum(["asc", "desc"]).optional().default("desc")
  }),
  execute: async ({ model, limit, orderBy, orderDir }: { model: string, limit?: number, orderBy?: string, orderDir?: "asc" | "desc" }) => {
    // Basic safe query builder
    // @ts-ignore - dynamic access to prisma model
    const delegate = prisma[model];
    
    if (!delegate) {
      throw new Error(`Model ${model} not found or access denied.`);
    }

    const queryArgs: any = {
      take: limit,
    };

    if (orderBy) {
      queryArgs.orderBy = {
        [orderBy]: orderDir
      };
    }

    const data = await delegate.findMany(queryArgs);
    return data;
  }
};
