import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const manageDataTool = {
  name: "manage_data",
  description: "High-risk data management tool. Allows deleting or updating records. REQUIRES ADMIN ROLE.",
  inputSchema: z.object({
    model: z.enum(["Customer", "Order", "User"]).describe("Target model"),
    action: z.enum(["delete", "update"]).describe("Action to perform"),
    id: z.string().describe("ID of the record to modify"),
    data: z.record(z.any()).optional().describe("Data for update action"),
  }),
  execute: async ({ model, action, id, data }: { model: string, action: "delete" | "update", id: string, data?: any }) => {
    // @ts-ignore
    const delegate = prisma[model];
    if (!delegate) throw new Error("Invalid model");

    if (action === "delete") {
      return await delegate.delete({ where: { id } });
    } else if (action === "update") {
      return await delegate.update({ where: { id }, data });
    }
  }
};
