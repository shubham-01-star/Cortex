/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineTool } from "@tambo-ai/react";
import { AdminStats } from "@/components/tambo/AdminStats";
// UserCard removed
import { z } from "zod";

// Cortex Server Actions
import { 
  visualizeSchema, 
  fetchBusinessData, 
  visualizeAnalytics, 
  modifySchema, // Imported
} from "@/actions/cortex-tools";

import { SchemaCanvas } from "@/components/cortex/SchemaCanvas";
import { SmartTable } from "@/components/cortex/SmartTable";
import { GhostModeModal } from "@/components/cortex/GhostModeModal";
import { SmartChart } from "@/components/cortex/SmartChart";
import { MigrationForm } from "@/components/cortex/MigrationForm";
import { DbConnectForm } from "@/components/cortex/DbConnectForm";
import { InviteForm } from "@/components/cortex/InviteForm"; // Imported

// --- RE-DEFINED SCHEMAS (Safe for Client) ---

const visualizeSchemaInput = z.object({
  focusTables: z.array(z.string()).optional().describe("Optional list of table names to focus on"),
});

const fetchBusinessDataInput = z.object({
  entity: z.enum(["orders", "customers"]).describe("Entity to fetch"),
  limit: z.number().optional().describe("Number of records to fetch"),
});

const visualizeAnalyticsInput = z.object({
  metric: z.enum(["revenue", "customers"]).describe("Metric to visualize"),
  period: z.enum(["daily", "weekly", "monthly"]).optional().describe("Time period"),
});

const modifySchemaInput = z.object({
  tableName: z.string().describe("Name of the table to create or modify"),
  columns: z.array(z.object({
    name: z.string(),
    type: z.string()
  })).describe("List of columns with types"),
  action: z.enum(["create", "alter"]).describe("Action type")
});

const manageDataInput = z.object({
  model: z.enum(["Customer", "Order", "User"]).describe("Target model"),
  action: z.enum(["delete", "update"]).describe("Action to perform"),
  id: z.string().describe("ID of the record to modify"),
  data: z.string().optional().describe("JSON string of data for update action"),
});

/**
 * Creates the toolset for a specific user role.
 * This allows "baking in" security checks directly into the tool logic.
 */
export function createTools(role: "admin" | "user") {
  return [
    // --- GENESIS TOOL ---
    defineTool({
      name: "connect_database",
      description: "Triggers the database connection elicitation form. Use this when the system detects no database is configured.",
      inputSchema: z.object({}),
      outputSchema: z.object({ status: z.string() }),
      tool: async () => {
         return { status: "setup_required" };
      }
    }),

    // --- LEGACY TOOLS (Keep for reference or remove if needed) ---
    defineTool({
      name: "getSystemHealth",
      description: "Retrieves analytics. Admin only.",
      inputSchema: z.object({ verbose: z.boolean().optional() }),
      outputSchema: z.object({ status: z.string(), message: z.string(), data: z.any().optional() }),
      tool: async (params) => { // Removed verbose param since we don't use it but Zod validates it exists.
        if (role !== "admin") return { status: "denied", message: "Access Denied." };
        return { status: "optimal", message: "System OK", data: { cpu: "12%" } };
      },
    }),
    
    defineTool({
      name: "invite_user",
      description: "Invites a new member to the team. If details are missing, it triggers the Invite Form elicitation.",
      inputSchema: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        role: z.enum(["ADMIN", "DEVELOPER", "VIEWER"]).optional(),
        position: z.string().optional(),
      }),
      outputSchema: z.object({ status: z.string() }),
      tool: async (params) => {
         // We simply return the params so they can be passed as props to the InviteForm
         // The UI component will handle the actual submission via Server Action
         return { ...params, status: "form_ready" };
      }
    }),

    // --- CORTEX TOOLS ---

    // 1. Visualize Schema
    defineTool({
      name: "visualize_schema",
      description: "Visualizes the database schema structure (tables and relationships).",
      inputSchema: visualizeSchemaInput,
      outputSchema: z.object({ nodes: z.array(z.any()), edges: z.array(z.any()) }),
      tool: async (params) => { // params used
        // Call Server Action
        const result = await visualizeSchema(params); // Passed params
        if (result.error) {
           throw new Error(result.error);
        }
        return { nodes: result.nodes, edges: result.edges };
      },
    }),

    // 2. Fetch Business Data
    defineTool({
      name: "fetch_business_data",
      description: "Safely fetches business data (Orders, Customers). Admin only.",
      inputSchema: fetchBusinessDataInput,
      outputSchema: z.object({ data: z.array(z.any()) }),
      tool: async (params) => {
        // Call Server Action
        const result = await fetchBusinessData(params.entity, params.limit);
        
        if (result.status === "denied") {
             throw new Error(result.message);
        }
        
        if (result.status === "error") {
            throw new Error(result.message);
        }

        return { data: result.data }; 
      },
    }),

    // 2b. Visualize Analytics (Generative Charts)
    defineTool({
      name: "visualize_analytics",
      description: "Generates visual charts for key business metrics.",
      inputSchema: visualizeAnalyticsInput,
      outputSchema: z.object({ 
        title: z.string(),
        data: z.array(z.any()),
        type: z.enum(["bar", "line"]).optional(),
        xAxisKey: z.string(),
        dataKey: z.string(),
        description: z.string().optional()
      }),
      tool: async (params) => {
        const result = await visualizeAnalytics(params.metric, params.period);
        
        if (result.status === "denied") throw new Error(result.message);
        if (result.status === "error") throw new Error(result.message);

        // Stripping 'status' from result to match outputSchema partiality or just passing through
        const { status, ...rest } = result; 
        return rest;
      },
    }),

    // 2c. Modify Schema (Migration Wizard)
    defineTool({
      name: "modify_schema",
      description: "Starts the schema migration process using an elicitation form. Admin only.",
      inputSchema: modifySchemaInput,
      outputSchema: z.object({
        status: z.string(),
        tableName: z.string().optional(),
        columns: z.array(z.any()).optional(),
        suggestedAction: z.enum(["create", "alter"]).optional(),
        message: z.string().optional()
      }),
      tool: async (params) => {
        if (role !== "admin") return { status: "denied", message: "Access Denied: Admin role required." };
        
        const result = await modifySchema(params.tableName, params.columns, params.action);
        
        if (result.status === "denied") throw new Error((result as any).message); // Type casting for convenience
        
        return result; 
      }
    }),

    // 3. Manage Data (Ghost Mode)
    defineTool({
      name: "manage_data",
      description: "High-risk data management tool. Allows deleting or updating records. REQUIRES ADMIN ROLE.",
      inputSchema: manageDataInput,
      // Include message for denied state
      outputSchema: z.object({ 
        status: z.string(), 
        actionSummary: z.string().optional(),
        isOpen: z.boolean().optional(),
        message: z.string().optional()
      }),
      tool: async (params) => {
        // 🔐 RBAC CHECK (Client Side Pre-Check)
        if (role !== "admin") {
          return { status: "denied", message: "Access Denied: Admin role required." };
        }

        // Return "Confirmation Needed" state to trigger Ghost Mode Modal
        // Map requiresConfirmation -> isOpen for the component
        return {
          status: "pending_confirmation",
          isOpen: true,
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
  // Genesis
  {
    name: "connect_database",
    description: "Renders DB connection form",
    component: DbConnectForm,
    propsSchema: z.object({ status: z.string() }),
  },
  
  {
    name: "invite_user",
    description: "Renders Invite Team form",
    component: InviteForm,
    propsSchema: z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      role: z.string().optional(),
      position: z.string().optional(),
      status: z.string().optional(),
    }),
  },

  // Legacy
  {
    name: "getSystemHealth",
    description: "System stats",
    component: AdminStats,
    propsSchema: z.object({ status: z.string(), message: z.string(), data: z.any().optional() }),
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
    component: SmartTable, 
    propsSchema: z.object({ 
      data: z.array(z.any()) 
    }),
  },
  {
    name: "visualize_analytics",
    description: "Renders chart visualization",
    component: SmartChart,
    propsSchema: z.object({
      title: z.string(),
      data: z.array(z.any()),
      type: z.enum(["bar", "line"]).optional(),
      xAxisKey: z.string(),
      dataKey: z.string(),
      description: z.string().optional()
    }),
  },
  {
    name: "modify_schema",
    description: "Renders migration elicitation form",
    component: MigrationForm,
    propsSchema: z.object({
      tableName: z.string().optional(),
      columns: z.array(z.any()).optional(),
      suggestedAction: z.enum(["create", "alter"]).optional()
    })
  },
  {
    name: "manage_data",
    description: "Renders Ghost Mode confirmation",
    component: GhostModeModal,
    // Add message to props schema to handle denied state gracefully if component uses it
    propsSchema: z.object({ 
      status: z.string(), // Not used by component but part of payload
      actionSummary: z.string().optional(),
      isOpen: z.boolean().optional(),
      message: z.string().optional()
    }),
  },
];
