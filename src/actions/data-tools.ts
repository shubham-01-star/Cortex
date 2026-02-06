"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const fetchBusinessDataInput = z.object({
    entity: z.enum(["orders", "customers"]).describe("Entity to fetch"),
    limit: z.number().optional().describe("Number of records to fetch"),
});

export type FetchBusinessDataInput = z.infer<typeof fetchBusinessDataInput>;

/**
 * Fetches business data (orders or customers) from the database.
 * Used by the fetch_business_data tool.
 */
export async function fetchBusinessData(params: FetchBusinessDataInput) {
    try {
        const limit = params.limit || 10;

        if (params.entity === "orders") {
            const orders = await prisma.order.findMany({
                take: limit,
                include: {
                    Customer: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            return {
                success: true,
                entity: "orders",
                data: orders,
                count: orders.length,
            };
        }

        if (params.entity === "customers") {
            const customers = await prisma.customer.findMany({
                take: limit,
                include: {
                    Order: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            return {
                success: true,
                entity: "customers",
                data: customers,
                count: customers.length,
            };
        }

        return {
            success: false,
            message: "Invalid entity type",
        };
    } catch (error) {
        console.error("Failed to fetch business data:", error);
        return {
            success: false,
            message: "Failed to fetch data from database",
        };
    }
}
