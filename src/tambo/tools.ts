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
  denyUnlessPermission, // Imported
  type ReactFlowNode,
  type ReactFlowEdge
} from "@/server/actions/cortex-tools";

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
          return { success: true, message: "Logged in successfully. Opening Cortex...", action: "AUTH_PROCESS" };
        }
        return {
          message: "Please enter your email and password to log in.",
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
          return { success: true, message: "Account created successfully. Opening Cortex...", action: "AUTH_PROCESS" };
        }
        return {
          message: "Please fill in your details to create a new account.",
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
          message: "Welcome to Cortex. Please log in or sign up to continue.",
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
          const { saveConnection } = await import("@/server/actions/connection-tools");
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
      outputSchema: z.any(),
      tool: async (params) => {
        // We simply return the params so they can be passed as props to the InviteForm
        // The UI component will handle the actual submission via Server Action
        return { ...params, component: "invite_user", status: "form_ready" };
      }
    }),

    // --- CORTEX TOOLS ---

    // 1. Visualize Schema
    defineTool({
      name: "visualize_schema",
      description: "Visualizes the database schema structure (tables and relationships).",
      inputSchema: visualizeSchemaInput,
      outputSchema: z.any(),
      tool: async (params) => {
        // Call Server Action
        const denied = await denyUnlessPermission("READ");
        if (denied) throw new Error(denied.message);

        const result = await visualizeSchema(params); // Passed params
        if (result.error) {
          throw new Error(result.error);
        }
        return { nodes: result.nodes ?? [], edges: result.edges ?? [], component: "visualize_schema" };
      },
    }),

    // 2. Visualize Architecture (Open Source - Mermaid.js)
    defineTool({
      name: "visualize_architecture",
      description: "Generates a high-level architecture or ERD diagram using Mermaid.js syntax. Use this when the user asks for 'architecture', 'system design', or specific role-based views (CTO, Sales).",
      inputSchema: z.object({
        role: z.enum(["Developer", "CTO", "CEO", "Sales"]).optional().describe("The persona to generate the diagram for"),
        focus: z.enum(["Database", "Auth", "System"]).optional().describe("The specific module to visualize"),
      }),
      outputSchema: z.object({
        dslCode: z.string(),
        role: z.string(),
      }),
      tool: async (params) => {
        const role = params.role || "Developer";

        let dsl = "";

        // Heuristic: In Cortex, 'Role' often equates to 'Position' (e.g. CTO, Sales)
        // We visualize the system based on these "Lenses".

        if (role === "Developer") {
          // ... (Keep existing Developer logic: Real Schema ERD)
          try {
            const schemaResult = await visualizeSchema({});
            if (schemaResult.error) {
              dsl = `graph TD;\nError[Error: ${schemaResult.error}]`;
            } else {
              dsl = "erDiagram\n";
              (schemaResult.nodes as ReactFlowNode[]).forEach((node: ReactFlowNode) => {
                const tableName = node.data.label;
                dsl += `  ${tableName} {\n`;
                node.data.fields.forEach((field: { name: string; type: string; isId: boolean }) => {
                  const type = field.type || "string";
                  const key = field.isId ? "PK" : "";
                  const cleanType = type.replace(/[^a-zA-Z0-9]/g, "");
                  dsl += `    ${cleanType} ${field.name} ${key}\n`;
                });
                dsl += `  }\n`;
              });
              (schemaResult.edges as ReactFlowEdge[]).forEach((edge: ReactFlowEdge) => {
                dsl += `  ${edge.source} ||--o{ ${edge.target} : "related_to"\n`;
              });
              if (schemaResult.nodes.length === 0) dsl = `graph TD;\nEmpty[No Tables Found];`;
            }
          } catch (err) { dsl = `graph TD;\nError[Failed to fetch schema]`; }

        } else if (role === "CTO") {
          // CTO View: High-Level Architecture & Permissions
          // Visualizing who has access to what (Role-Based Access Control)
          dsl = `
            graph TD
              subgraph "User Roles (Positions)"
                Admin[Admin / CTO]
                Dev[Developer]
                Viewer[Sales / Viewer]
              end
              
              subgraph "System Resources"
                DB[(Database Production)]
                Settings[System Settings]
                Logs[Audit Logs]
                API[API Access]
              end

              %% Permissions Data Flow
              Admin ==>|Full Access| DB
              Admin ==>|Manage| Settings
              
              Dev -->|Read/Write| DB
              Dev -->|View| Logs
              
              Viewer -.->|Read Only| DB
              Viewer -.->|No Access| Settings

              style Admin fill:#ef4444,stroke:#fff,stroke-width:2px,color:#fff
              style DB fill:#4f46e5,stroke:#fff,stroke-width:2px,color:#fff
            `;
        } else if (role === "Sales") {
          // Sales View: Customer Journey Flow
          dsl = `
            sequenceDiagram
              participant Lead as Potential Customer
              participant Sales as Sales Rep
              participant System as Cortex System
              participant DB as Database
              
              Lead->>System: Signs Up (Role: User)
              System->>DB: Create User Record
              System->>Sales: Notify New Lead
              Sales->>Lead: Schedule Demo
              Lead->>System: Upgrades to Pro
              System->>DB: Update Status = Active
              System->>Sales: Commission Recorded!
            `;
        } else {
          dsl = `graph TD; A[Start] --> B[Limit Reached];`;
        }

        return {
          dslCode: dsl,
          role: role
        };
      }
    }),


    // 2. Fetch Business Data (Dynamic & Generic)
    defineTool({
      name: "fetch_business_data", // Keeping name same for config compatibility, but logic is dynamic
      description: "Fetches data from ANY database table (e.g. 'users', 'orders', 'products'). Use this when user asks to see records.",
      inputSchema: z.object({
        entity: z.string().describe("Table name to fetch from (e.g. 'User', 'Order')"),
        limit: z.number().optional()
      }),
      outputSchema: z.any(),
      tool: async (params) => {
        const denied = await denyUnlessPermission("READ");
        if (denied) throw new Error(denied.message);

        // Use the DYNAMIC service which works for any table
        const { fetchDynamicBusinessData } = await import("@/server/actions/cortex-tools");

        const result = await fetchDynamicBusinessData(params.entity, params.limit);

        if (result.status === "denied" || result.status === "error") {
          // Dynamic fetch failed - throw error to let AI handle it or retry
          throw new Error(result.message || "Failed to fetch data");
        }

        return {
          data: result.data ?? [],
          title: params.entity ?? "Unknown Table", // Maps to SmartTable 'title' prop
          tableName: params.entity ?? "Unknown Table", // For debugging/context
          component: "fetch_business_data"
        };
      },
    }),

    // 2b. Visualize Analytics (Generative Charts)
    defineTool({
      name: "visualize_analytics",
      description: "Generates visual charts from any database table. YOU MUST determine the table and columns from the schema first. Do not guess.",
      inputSchema: z.object({
        tableName: z.string().describe("The name of the table to query (e.g. 'Orders')"),
        xAxisColumn: z.string().describe("Column for X-Axis (e.g. 'created_at', 'category')"),
        yAxisColumn: z.string().describe("Column for Y-Axis (e.g. 'amount', 'score')"),
        operation: z.enum(["sum", "count"]).optional().describe("Aggregation type. Default is 'sum'."),
      }),
      outputSchema: z.object({
        title: z.string(),
        data: z.array(z.any()),
        type: z.enum(["bar", "line"]).optional(),
        xAxisKey: z.string(),
        dataKey: z.string(),
        description: z.string().optional()
      }),
      tool: async (params) => {
        const denied = await denyUnlessPermission("READ");
        if (denied) throw new Error(denied.message);

        const result = await visualizeAnalytics(
          params.tableName,
          params.xAxisColumn,
          params.yAxisColumn,
          params.operation
        );

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
        const denied = await denyUnlessPermission("WRITE");
        if (denied) return { status: "denied", message: denied.message };

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
        const requiredPerm = params.action === "delete" ? "DELETE" : "WRITE";
        const denied = await denyUnlessPermission(requiredPerm);
        if (denied) return { status: "denied", message: denied.message };

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
