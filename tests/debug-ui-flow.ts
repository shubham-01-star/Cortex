/**
 * Debug script to test the exact flow that happens in UI
 * Run with: npx tsx tests/debug-ui-flow.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function simulateUIFlow() {
    console.log("\n🔍 Simulating UI Flow");
    console.log("=".repeat(60));

    // Step 1: Get user (simulating logged-in user)
    const user = await prisma.user.findFirst({
        where: { email: "test@123.com" },
    });

    if (!user) {
        console.error("❌ User not found. Please login first.");
        return;
    }

    console.log("✅ User found:", user.email, "Role:", user.role);

    // Step 2: Check if user has admin role
    if (user.role !== "admin") {
        console.error("❌ User is not admin. Schema visualization requires admin role.");
        return;
    }

    console.log("✅ User is admin");

    // Step 3: Check DB config
    const dbConfig = await prisma.dbConfig.findFirst({
        where: { userId: user.id, isActive: true },
    });

    if (!dbConfig) {
        console.error("❌ No active database configuration found.");
        console.log("   User needs to connect a database first.");
        return;
    }

    console.log("✅ DB config found:", dbConfig.provider);

    // Step 4: Call visualizeDynamicSchema (simulating what Tambo tool does)
    console.log("\n📊 Calling visualizeDynamicSchema...");

    const { visualizeDynamicSchema } = await import("../src/server/actions/cortex-tools");

    try {
        const result = await visualizeDynamicSchema();

        if (result.error) {
            console.error("❌ Error:", result.error);
            return;
        }

        console.log("✅ Schema fetched successfully!");
        console.log(`   Nodes: ${result.nodes.length}`);
        console.log(`   Edges: ${result.edges.length}`);

        // Step 5: Validate the structure
        console.log("\n🔍 Validating node structure...");

        if (result.nodes.length === 0) {
            console.warn("⚠️  No nodes returned!");
            return;
        }

        const firstNode = result.nodes[0];
        console.log("\n📋 First Node Structure:");
        console.log(JSON.stringify(firstNode, null, 2));

        // Check required fields
        const requiredFields = ["id", "type", "position", "data"];
        for (const field of requiredFields) {
            if (!(field in firstNode)) {
                console.error(`❌ Missing required field: ${field}`);
            } else {
                console.log(`✅ Has field: ${field}`);
            }
        }

        // Check data.fields
        if (firstNode.data && firstNode.data.fields) {
            console.log(`✅ Has fields: ${firstNode.data.fields.length} columns`);

            const firstField = firstNode.data.fields[0];
            console.log("\n📋 First Field Structure:");
            console.log(JSON.stringify(firstField, null, 2));

            // Validate field structure
            if (!firstField.name || !firstField.type || typeof firstField.isId !== "boolean") {
                console.error("❌ Invalid field structure!");
            } else {
                console.log("✅ Field structure is valid");
            }
        } else {
            console.error("❌ Missing data.fields!");
        }

        // Step 6: Test Zod validation (what Tambo does)
        console.log("\n🔍 Testing Zod Validation (Tambo propsSchema)...");

        const { z } = await import("zod");

        const propsSchema = z.object({
            nodes: z.array(
                z.object({
                    id: z.string(),
                    type: z.string().optional(),
                    position: z.object({ x: z.number(), y: z.number() }),
                    data: z.object({
                        label: z.string(),
                        fields: z.array(
                            z.object({
                                name: z.string(),
                                type: z.string(),
                                isId: z.boolean(),
                            })
                        ),
                    }),
                })
            ),
            edges: z.array(
                z.object({
                    id: z.string(),
                    source: z.string(),
                    target: z.string(),
                    label: z.string().optional(),
                })
            ),
        });

        try {
            propsSchema.parse({ nodes: result.nodes, edges: result.edges });
            console.log("✅ Zod validation passed!");
        } catch (error: any) {
            console.error("❌ Zod validation failed!");
            console.error(error.errors);
            return;
        }

        // Step 7: Summary
        console.log("\n" + "=".repeat(60));
        console.log("📊 Summary");
        console.log("=".repeat(60));
        console.log(`User: ${user.email} (${user.role})`);
        console.log(`DB: ${dbConfig.provider}`);
        console.log(`Tables: ${result.nodes.length}`);
        console.log(`Relationships: ${result.edges.length}`);
        console.log("\n✅ Everything looks good! The UI should work.");
        console.log("=".repeat(60));
    } catch (error) {
        console.error("\n❌ Error during flow:");
        console.error(error);
    }

    await prisma.$disconnect();
}

simulateUIFlow();
