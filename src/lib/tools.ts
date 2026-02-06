import { defineTool } from "@tambo-ai/react";
import { AdminStats } from "@/components/tambo/AdminStats";
import { UserCard } from "@/components/tambo/UserCard";
import { z } from "zod";

// Cortex Imports
import { visualizeSchemaTool } from "@/tools/schema-tools";
import { fetchBusinessDataTool } from "@/tools/data-tools";
import { manageDataTool } from "@/tools/admin-tools";

import { SchemaCanvas } from "@/components/cortex/SchemaCanvas";
import { SmartTable } from "@/components/cortex/SmartTable";
import { GhostModeModal } from "@/components/cortex/GhostModeModal";

/**
 * Creates the toolset for a specific user role.
 * This allows "baking in" security checks directly into the tool logic.
 */
export function createTools(role: "admin" | "user") {
  return [
    // --- LEGACY TOOLS (Keep for reference or remove if needed) ---
    defineTool({
      name: "getSystemHealth",
      description: "Retrieves analytics. Admin only.",
      inputSchema: z.object({ verbose: z.boolean().optional() }),
      outputSchema: z.object({ status: z.string(), message: z.string(), data: z.any() }),
      tool: async (params) => {
        if (role !== "admin") return { status: "denied", message: "Access Denied." };
        return { status: "optimal", message: "System OK", data: { cpu: "12%" } };
      },
    }),
    
    // --- CORTEX TOOLS ---

    // 1. Visualize Schema
    defineTool({
      name: "visualize_schema",
      description: visualizeSchemaTool.description,
      inputSchema: visualizeSchemaTool.inputSchema,
      outputSchema: z.object({ nodes: z.array(z.any()), edges: z.array(z.any()) }),
      tool: async (params) => {
        // Safe for all users
        return await visualizeSchemaTool.execute(params);
      },
    }),

    // 2. Fetch Business Data
    defineTool({
      name: "fetch_business_data",
      description: fetchBusinessDataTool.description,
      inputSchema: fetchBusinessDataTool.inputSchema,
      outputSchema: z.array(z.any()),
      tool: async (params) => {
        // Could add role-based row filtering here
        const result = await fetchBusinessDataTool.execute(params);
        return { data: result }; // formatted for SmartTable
      },
    }),

    // 3. Manage Data (Ghost Mode)
    defineTool({
      name: "manage_data",
      description: manageDataTool.description,
      inputSchema: manageDataTool.inputSchema,
      outputSchema: z.object({ 
        status: z.string(), 
        actionSummary: z.string().optional(),
        requiresConfirmation: z.boolean().optional() 
      }),
      tool: async (params) => {
        // 🔐 RBAC CHECK
        if (role !== "admin") {
          return { status: "denied", message: "Access Denied: Admin role required." };
        }

        // Return "Confirmation Needed" state to trigger Ghost Mode Modal
        return {
          status: "pending_confirmation",
          requiresConfirmation: true,
          actionSummary: `${params.action.toUpperCase()} operation on ${params.model} (ID: ${params.id})`,
        };
      },
    }),
  ];
}

// For backward compatibility
export const allTools = createTools("admin");

/**
 * GENERATIVE UI COMPONENT REGISTRY
 * Maps the Tool Name -> React Component
 */
export const tamboComponents = [
  // Legacy
  {
    name: "getSystemHealth",
    description: "System stats",
    component: AdminStats,
    propsSchema: z.object({ status: z.string(), message: z.string(), data: z.any() }),
  },
  
  // Cortex
  {
    name: "visualize_schema",
    description: "Renders database schema graph",
    component: SchemaCanvas,
    propsSchema: z.object({ 
      nodes: z.array(z.any()), 
      edges: z.array(z.any()) 
    }),
  },
  {
    name: "fetch_business_data",
    description: "Renders data table",
    // SmartTable expects "data" prop. Use 'transform' or ensure tool returns object with data key? 
    // Wait, SmartTable props are { title, data }. Tool returns array. 
    // The component wrapper will need to handle this or we adjust tool output.
    // Simplified: Tool returns array. Tambo passes that as props?
    // Actually Tambo passes tool result directly as props.
    // So fetch_business_data tool should return { data: [...] }.
    component: SmartTable, 
    propsSchema: z.object({ 
      data: z.array(z.any()) 
    }),
  },
  {
    name: "manage_data",
    description: "Renders Ghost Mode confirmation",
    component: GhostModeModal,
    propsSchema: z.object({ 
      status: z.string(),
      actionSummary: z.string().optional(),
      requiresConfirmation: z.boolean().optional()
    }),
  },
];
