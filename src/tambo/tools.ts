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
    // --- ONBOARDING TOOLS ---
    defineTool({
      name: "login",
      description: "Presents the login form. The result is a UI component. Do NOT repeat the JSON result. Use this when the user chooses to identify with email.",
      inputSchema: z.object({
        email: z.string().optional(),
        password: z.string().optional()
      }),
      outputSchema: z.any(),
      tool: async (params) => {
        if (params.email && params.password) {
          return { success: true, message: "Access granted. Opening Cortex...", action: "AUTH_PROCESS" };
        }
        return {
          message: "Identify yourself to access the mainframe.",
          requestedSchema: {
            type: "object",
            properties: {
              email: { type: "string", description: "Email Address", format: "email" },
              password: { type: "string", description: "Password", format: "password" }
            },
            required: ["email", "password"]
          }
        };
      }
    }),

    defineTool({
      name: "signup",
      description: "Presents the registration form. The result is a UI component. Do NOT repeat the JSON result. Use this for new recruits.",
      inputSchema: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        password: z.string().optional()
      }),
      outputSchema: z.any(),
      tool: async (params) => {
        if (params.name && params.email && params.password) {
          return { success: true, message: "Protocol initialized. Access granted. Opening Cortex...", action: "AUTH_PROCESS" };
        }
        return {
          message: "Register your identity to join the fleet.",
          requestedSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Full Name" },
              email: { type: "string", description: "Email Address", format: "email" },
              password: { type: "string", description: "Password", format: "password" }
            },
            required: ["name", "email", "password"]
          }
        };
      }
    }),

    defineTool({
      name: "authenticate",
      description: "Presents the high-level identity protocol menu (Google, GitHub, Email options). The result is a UI component. Do NOT repeat the JSON result.",
      inputSchema: z.object({}),
      outputSchema: z.object({ message: z.string(), action: z.string() }),
      tool: async () => {
        return {
          message: "Welcome Commander. Identify yourself to access the mainframe.",
          action: "CHOOSE_AUTH"
        };
      }
    }),

    defineTool({
      name: "help",
      description: "Provides information about what Cortex can do.",
      inputSchema: z.object({}),
      outputSchema: z.any(),
      tool: async () => {
        return {
          message: "What would you like to explore first?",
          requestedSchema: {
            type: "object",
            properties: {
              capability: {
                type: "string",
                description: "Select a capability to learn more",
                enum: [
                  "visualize_schema",
                  "fetch_business_data",
                  "visualize_analytics",
                  "modify_schema",
                  "manage_data"
                ],
                enumNames: [
                  "Visual Schema Canvas (ReactFlow)",
                  "Smart Data Tables (Orders/Customers)",
                  "Pro-grade Analytics Charts",
                  "AI-driven Schema Migrations",
                  "Ghost Mode (Safe Data Actions)"
                ]
              }
            },
            required: ["capability"]
          }
        };
      }
    }),

    // --- GENESIS TOOL ---
    defineTool({
      name: "setup_database",
      description: "Connects a new database. If credentials are not provided, it triggers the elicitation form.",
      inputSchema: z.object({
        provider: z.string().optional(),
        host: z.string().optional(),
        port: z.number().optional(),
        user: z.string().optional(),
        password: z.string().optional(),
        database: z.string().optional(),
      }),
      outputSchema: z.any(),
      tool: async (params) => {
        // If we have the required fields, save it!
        if (params.provider && params.database) {
          const { saveConnection } = await import("@/actions/connection-tools");
          return await saveConnection(params as any);
        }

        // Otherwise, elicit
        return {
          message: "Please provide database connection details",
          requestedSchema: {
            type: "object",
            properties: {
              provider: {
                type: "string",
                description: "Database Provider",
                enum: ["postgresql", "mysql", "sqlite"],
                enumNames: ["PostgreSQL", "MySQL", "SQLite (Local)"]
              },
              host: { type: "string", description: "Host (e.g. localhost)" },
              port: { type: "integer", description: "Port (e.g. 5432)", minimum: 1, maximum: 65535 },
              user: { type: "string", description: "Username" },
              password: { type: "string", description: "Password" },
              database: { type: "string", description: "Database Name" }
            },
            required: ["provider", "host", "database"]
          }
        };
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

export { tamboComponents } from "./config";
