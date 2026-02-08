"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { MOCK_SCENARIOS } from "@/server/data/mock-scenarios";
import { v4 as uuidv4 } from "uuid";

// --- Types needed to mimic Tambo ---
export interface TamboMessage {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: any[];
    createdAt?: string;
}

export interface TamboThread {
    id: string;
    messages: TamboMessage[];
}

export interface TamboContextType {
    thread: TamboThread | null;
    sendThreadMessage: (message: string) => Promise<void>;
    streaming: boolean;
}

const MockTamboContext = createContext<TamboContextType | null>(null);

export function MockTamboProvider({ children }: { children: React.ReactNode }) {
    // 1. Initialize State
    const [messages, setMessages] = useState<TamboMessage[]>([]);
    const [streaming, setStreaming] = useState(false);

    // Check genesis state on mount
    React.useEffect(() => {
        let isMounted = true;
        const genesisDone = localStorage.getItem("cortex_mock_genesis_completed");

        if (genesisDone === "true") {
            setMessages(prev => {
                if (prev.some(m => m.id === "system-ready")) return prev;
                return [
                    {
                        id: "system-ready",
                        role: "assistant",
                        content: [{ type: "text", text: "System Online. Database connected. Ready for commands." }]
                    }
                ];
            });
        } else {
            // GENESIS FLOW START
            setMessages(prev => {
                if (prev.some(m => m.id === "genesis-init")) return prev;
                return [
                    {
                        id: "genesis-init",
                        role: "assistant",
                        content: [{ type: "text", text: "Welcome to Cortex. System ready." }]
                    }
                ];
            });

            // Sequence:
            // 1. "No DB" message
            const timer1 = setTimeout(() => {
                if (!isMounted) return;
                setMessages(prev => {
                    // Dedup check
                    if (prev.some(m => m.content[0].text.includes("No database"))) return prev;
                    return [
                        ...prev,
                        {
                            id: uuidv4(),
                            role: "assistant",
                            content: [{ type: "text", text: "No database connection detected. Let's set one up." }]
                        }
                    ];
                });
            }, 1000);

            // 2. Open Form
            const timer2 = setTimeout(() => {
                if (!isMounted) return;
                setMessages(prev => {
                    if (prev.some(m => m.content[0].type === "tool-result" && m.content[0].toolName === "setup_database")) return prev;
                    return [
                        ...prev,
                        {
                            id: uuidv4(),
                            role: "assistant",
                            content: [{
                                type: "tool-result",
                                toolName: "setup_database",
                                result: {}
                            }]
                        }
                    ];
                });
            }, 2000);

            return () => {
                isMounted = false;
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        }
    }, []);

    const sendThreadMessage = useCallback(async (text: string) => {
        // 1. Add User Message
        const userMsg: TamboMessage = {
            id: uuidv4(),
            role: "user",
            content: [{ type: "text", text }]
        };
        setMessages(prev => [...prev, userMsg]);
        setStreaming(true);

        // --- SIMULATION START ---

        // 2. "Thinking" phase (1.5s)
        await new Promise(r => setTimeout(r, 1500));

        const lowerText = text.toLowerCase();
        let toolCall: { name: string; result: any } | null = null;
        let assistantText = "I can help with that.";

        // GENESIS CHECK: If user just connected DB (implied by context or page reload)
        // Actually, DbConnectForm reloads the page. So we never reach here for the "Connect" action if it succeeds.
        // But if the user types "Show schema" after reload, we handle it below.

        // Logic Router
        if (lowerText.includes("schema") || lowerText.includes("database") || lowerText.includes("erd")) {
            assistantText = "I'll visualize the current database schema for you. This will show the Users, Orders, and Products tables.";
            toolCall = { name: "visualize_schema", result: MOCK_SCENARIOS.SCHEMA };
        }
        else if (lowerText.includes("delete") || lowerText.includes("remove") || lowerText.includes("update") || lowerText.includes("edit")) {
            assistantText = "This action requires admin confirmation.";
            // Extract mock ID if possible, default to 1
            const idMatch = text.match(/\d+/);
            const id = idMatch ? idMatch[0] : "1";
            const action = lowerText.includes("update") || lowerText.includes("edit") ? "UPDATE" : "DELETE";

            toolCall = {
                name: "manage_data",
                result: {
                    status: "pending_confirmation",
                    isOpen: true,
                    actionSummary: `${action} on orders (ID: ${id})`, // Mocking orders for now
                    model: "orders",
                    action,
                    id
                }
            };
        }
        else if (lowerText.includes("order") || lowerText.includes("table") || lowerText.includes("data")) {
            assistantText = "Fetching the latest orders from the database...";
            toolCall = { name: "fetch_business_data", result: MOCK_SCENARIOS.TABLE_ORDERS };
        }
        else if (lowerText.includes("revenue") || lowerText.includes("chart") || lowerText.includes("analytics")) {
            assistantText = "Analyzing revenue data. Here is the monthly performance chart.";
            toolCall = { name: "visualize_analytics", result: MOCK_SCENARIOS.CHART_REVENUE };
        }
        else if (lowerText.includes("invite") || lowerText.includes("member")) {
            assistantText = "Opening the team invitation form.";
            toolCall = { name: "invite_user", result: { status: "form_ready" } };
        }
        else if (lowerText.includes("connect") || lowerText.includes("setup")) {
            assistantText = "Let's connect a new database.";
            toolCall = { name: "setup_database", result: {} };
        }
        else if (lowerText.includes("confirmed") && lowerText.includes("admin")) {
            assistantText = "Acknowledgment received. Executing operation...";
            toolCall = {
                name: "manage_data",
                result: {
                    status: "success",
                    message: "Successfully executed operation on mock database."
                }
            };
        }
        else {
            assistantText = `[MOCK] I received: "${text}". \n\nTry asking for:\n- "Show schema"\n- "Show orders table"\n- "Visualize revenue"\n- "Invite member"\n- "Delete order 1"`;
        }

        // 3. "Streaming" Response (Simulated)
        if (toolCall) {
            // Step 3a: Text Response
            const botMsgText: TamboMessage = {
                id: uuidv4(),
                role: "assistant",
                content: [{ type: "text", text: assistantText }]
            };
            setMessages(prev => [...prev, botMsgText]);

            // Step 3b: Tool Execution Delay (1s)
            await new Promise(r => setTimeout(r, 1000));

            // Step 3c: Tool Result
            const toolMsg: TamboMessage = {
                id: uuidv4(),
                role: "assistant",
                content: [
                    {
                        type: "tool-result",
                        toolName: toolCall.name,
                        result: toolCall.result
                    }
                ]
            };
            setMessages(prev => [...prev, toolMsg]);

        } else {
            // Just text
            const botMsg: TamboMessage = {
                id: uuidv4(),
                role: "assistant",
                content: [{ type: "text", text: assistantText }]
            };
            setMessages(prev => [...prev, botMsg]);
        }

        setStreaming(false);
    }, []);

    const value = useMemo(() => ({
        thread: { id: "mock-thread", messages },
        sendThreadMessage,
        streaming
    }), [messages, sendThreadMessage, streaming]);

    return (
        <MockTamboContext.Provider value={value}>
            {children}
        </MockTamboContext.Provider>
    );
}

// Hook to be used by the Facade
export function useMockTambo() {
    const context = useContext(MockTamboContext);
    if (!context) {
        throw new Error("useMockTambo must be used within a MockTamboProvider");
    }
    return context;
}
