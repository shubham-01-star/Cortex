
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ErrorCode,
    McpError
} from "@modelcontextprotocol/sdk/types.js";
import { Pool } from "pg";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 8000;

// Enable CORS for frontend access
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json()); // Added to handle post bodies

// Connect to the same DB as the main app
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const server = new Server(
    {
        name: "cortex-postgres-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "query_database",
                description: "Execute a read-only SQL query on the Postgres database",
                inputSchema: {
                    type: "object",
                    properties: {
                        sql: { type: "string", description: "The SQL query to execute (SELECT only)" },
                    },
                    required: ["sql"],
                },
            },
            {
                name: "list_tables",
                description: "List all public tables in the database",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            }
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "query_database") {
            const { sql } = args as { sql: string };

            // Simple security check
            if (!sql.trim().toUpperCase().startsWith("SELECT")) {
                throw new McpError(ErrorCode.InvalidParams, "Only SELECT queries are allowed via this tool.");
            }

            const result = await pool.query(sql);
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
            };
        }

        if (name === "list_tables") {
            const sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";
            const result = await pool.query(sql);
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
            };
        }

        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
    } catch (error: any) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

// SSE Transport setup
let transport: SSEServerTransport;

app.get("/sse", async (req, res) => {
    console.log("🔌 New SSE connection established");
    // Explicitly use the full path or ensure it matches the registration
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});

// Some clients might try to POST back to /sse if they don't pick up the endpoint header correctly
app.post("/sse", async (req, res) => {
    console.log("📥 Received MCP message on /sse (fallback)");
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).send("No active SSE session. Connect via GET /sse first.");
    }
});

app.post("/messages", async (req, res) => {
    console.log("📥 Received MCP message on /messages");
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).send("No active SSE session");
    }
});

app.listen(port, () => {
    console.log(`🚀 Postgres MCP Server running at http://localhost:${port}/sse`);
});
