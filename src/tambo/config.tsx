import { z } from "zod";
import { AdminStats } from "@/components/tambo/AdminStats";
import { DbConnectForm } from "@/components/cortex/DbConnectForm";
import { InviteForm } from "@/components/cortex/InviteForm";
import { SchemaCanvas } from "@/components/cortex/SchemaCanvas";
import { SmartTable } from "@/components/cortex/SmartTable";
import { SmartChart } from "@/components/cortex/SmartChart";
import { MigrationForm } from "@/components/cortex/MigrationForm";
import { GhostModeModal } from "@/components/cortex/GhostModeModal";
import { StatusCard } from "@/components/cortex/StatusCard";

import { AuthActions } from "@/components/onboarding/AuthActions";
import { ElicitationUI } from "@/components/tambo/elicitation-ui";

/**
 * GENERATIVE UI COMPONENT REGISTRY
 * Maps the Tool Name -> React Component
 */
export const tamboComponents = [
    // Onboarding
    {
        name: "login",
        description: "Renders login form",
        component: ElicitationUI,
        viewType: "IDLE",
        propsSchema: z.object({
            message: z.string(),
            requestedSchema: z.any(),
            signal: z.any().optional(),
        }),
    },
    {
        name: "signup",
        description: "Renders signup form",
        component: ElicitationUI,
        viewType: "IDLE",
        propsSchema: z.object({
            message: z.string(),
            requestedSchema: z.any(),
            signal: z.any().optional(),
        }),
    },
    {
        name: "authenticate",
        description: "Renders auth choice menu",
        component: AuthActions,
        viewType: "IDLE",
        propsSchema: z.object({ message: z.string(), action: z.string() }),
    },
    {
        name: "help",
        description: "Renders help choices",
        component: ElicitationUI,
        viewType: "IDLE",
        propsSchema: z.object({
            message: z.string(),
            requestedSchema: z.any(),
            signal: z.any().optional(),
        }),
    },
    // Genesis
    {
        name: "setup_database",
        description: "Renders DB connection form",
        component: ElicitationUI,
        viewType: 'DB_CONNECT',
        propsSchema: z.object({
            message: z.string(),
            requestedSchema: z.any(),
            signal: z.any().optional(),
        }),
    },
    {
        name: "connection_status",
        description: "Shows DB connection status",
        component: StatusCard,
        viewType: 'IDLE',
        propsSchema: z.object({
            status: z.enum(["connected", "connecting", "error"]),
            message: z.string().optional(),
            provider: z.string().optional(),
        }),
    },

    {
        name: "invite_user",
        description: "Renders Invite Team form",
        component: InviteForm,
        viewType: 'INVITE',
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
        viewType: 'IDLE', // Legacy inline component
        propsSchema: z.object({ status: z.string(), message: z.string(), data: z.any().optional() }),
    },

    // Cortex
    {
        name: "visualize_schema",
        description: "Renders database schema graph",
        component: SchemaCanvas,
        viewType: 'SCHEMA',
        propsSchema: z.object({
            nodes: z.array(z.any()),
            edges: z.array(z.any())
        }),
    },
    {
        name: "fetch_business_data",
        description: "Renders data table",
        component: SmartTable,
        viewType: 'TABLE',
        propsSchema: z.object({
            data: z.array(z.any())
        }),
    },
    {
        name: "visualize_analytics",
        description: "Renders chart visualization",
        component: SmartChart,
        viewType: 'CHART',
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
        viewType: 'MIGRATION',
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
        viewType: 'GHOST_MODE',
        propsSchema: z.object({
            status: z.string(),
            actionSummary: z.string().optional(),
            isOpen: z.boolean().optional(),
            message: z.string().optional()
        }),
    },
    {
        name: "elicitation",
        description: "Standard Tambo Elicitation UI",
        component: ElicitationUI,
        viewType: "IDLE",
        propsSchema: z.object({
            message: z.string(),
            requestedSchema: z.any(),
            signal: z.any().optional(),
        }),
    },
];
