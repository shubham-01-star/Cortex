"use client";

import { useTambo, useTamboThread } from "@/hooks/use-tambo";
import { useCortexStore } from "@/lib/store";
import { SchemaCanvas } from "@/components/cortex/SchemaCanvas";
import { SmartTable } from "@/components/cortex/SmartTable";
import { SmartChart } from "@/components/cortex/SmartChart";
import { MigrationForm } from "@/components/cortex/MigrationForm";
import { DbConnectForm } from "@/components/cortex/DbConnectForm";
import { GhostModeModal } from "@/components/cortex/GhostModeModal";
import { InviteForm } from "@/components/cortex/InviteForm";
import { Layers, Database, Table, BarChart3, ShieldAlert, UserPlus, FileCode } from "lucide-react";
import { useState, useEffect } from "react";
import { tamboComponents } from "@/tambo/tools";
import { ErrorBoundary } from "@/components/ui/error-boundary";

/**
 * Recursively parse JSON strings to handle nested serialization
 * Converts nested JSON strings like '{"data":"[{...}]"}' to {data:[{...}]}
 */
function deepParseJSON(value: any, maxDepth = 5): any {
    if (maxDepth <= 0) return value; // Prevent infinite recursion

    // If it's a string, try to parse it
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            // Recursively parse the result
            return deepParseJSON(parsed, maxDepth - 1);
        } catch (e) {
            // Not JSON, return as-is
            return value;
        }
    }

    // If it's an array, recursively parse each element
    if (Array.isArray(value)) {
        return value.map(item => deepParseJSON(item, maxDepth - 1));
    }

    // If it's an object, recursively parse each property
    if (value && typeof value === 'object') {
        const result: any = {};
        for (const key in value) {
            result[key] = deepParseJSON(value[key], maxDepth - 1);
        }
        return result;
    }

    // Primitive value, return as-is
    return value;
}

export function CanvasPanel() {
    const { sendThreadMessage } = useTambo();
    const { thread } = useTamboThread();
    const { currentView, data, schemaData, setView } = useCortexStore();
    const [sId] = useState(() => Math.random().toString(36).substring(7).toUpperCase());

    // Sync Tambo Thread to Canvas View
    useEffect(() => {
        if (!thread?.messages?.length) return;

        // Find the latest message that has a component or tool result
        // We scan backwards from the end
        const messages = thread.messages;
        let foundConfig: { viewType: string; props: any } | null = null;

        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            console.log(`🔍 [CanvasPanel] Scanning message ${i}/${messages.length - 1}, role: ${msg.role}`);

            // Check if this is a tool message (contains tool results)
            // Browser test revealed: all parts have type="text", so we check role instead
            if (msg.role === 'tool') {
                console.log(`🔍 [CanvasPanel] Found tool message at index ${i}`);

                // Tool messages have content as an array with text parts
                const content = msg.content as any[];
                if (Array.isArray(content) && content.length > 0) {
                    // Get the first text part which contains the tool result
                    const textPart = content.find((p: any) => p.type === 'text');

                    if (textPart && textPart.text) {
                        console.log(`🔍 [CanvasPanel] Found text part with data`);

                        let rawProps = textPart.text;

                        console.log("🔍 [CanvasPanel] Before deep parse (type):", typeof rawProps);
                        console.log("🔍 [CanvasPanel] Before deep parse (value):", rawProps);

                        // Use deep parse to handle any level of nested JSON strings
                        rawProps = deepParseJSON(rawProps);

                        console.log("🔍 [CanvasPanel] After deep parse:", rawProps);
                        console.log("🔍 [CanvasPanel] Data field type:", typeof rawProps?.data, "Is array:", Array.isArray(rawProps?.data));
                        if (Array.isArray(rawProps?.data) && rawProps.data.length > 0) {
                            console.log("🔍 [CanvasPanel] First data item:", rawProps.data[0]);
                        }

                        // Extract component name from parsed props
                        const componentName = rawProps?.component;
                        console.log("🔍 [CanvasPanel] Component name:", componentName);

                        if (componentName) {
                            const config = tamboComponents.find(c => c.name === componentName);
                            console.log("🔍 [CanvasPanel] Config found:", config);

                            if (config?.viewType && config.viewType !== 'IDLE') {
                                foundConfig = { viewType: config.viewType, props: rawProps };
                                console.log(`🔍 [CanvasPanel] ✅ Using message ${i} for canvas rendering`);
                                break; // Found the latest
                            }
                        }
                    }
                }
            }
        }

        if (foundConfig) {
            console.log("🎨 [CanvasPanel] syncing view:", foundConfig.viewType);
            console.log("📦 [CanvasPanel] Props being passed:", foundConfig.props);
            setView(foundConfig.viewType as any, foundConfig.props);
        }

    }, [thread?.messages, setView]);

    const renderView = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props = (data as any) || {};

        try {
            switch (currentView) {
                case 'SCHEMA':
                    return (
                        <ErrorBoundary name="SchemaCanvas">
                            <SchemaCanvas {...props} />
                        </ErrorBoundary>
                    );
                case 'TABLE':
                    return (
                        <ErrorBoundary name="SmartTable">
                            <SmartTable {...props} />
                        </ErrorBoundary>
                    );
                case 'CHART':
                    return (
                        <ErrorBoundary name="SmartChart">
                            <SmartChart {...props} />
                        </ErrorBoundary>
                    );
                case 'GHOST_MODE':
                    return (
                        <div className="relative h-full w-full">
                            {!!schemaData && (
                                <div className="absolute inset-0 opacity-50 grayscale pointer-events-none">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <ErrorBoundary name="SchemaCanvasGhost">
                                        <SchemaCanvas {...(schemaData as any)} />
                                    </ErrorBoundary>
                                </div>
                            )}
                            <GhostModeModal
                                {...props}
                                onConfirm={() => {
                                    sendThreadMessage(`System: Admin confirmed execution of ${props.action?.toUpperCase()} on ${props.model} ${props.id}. Proceed.`);
                                    setView('IDLE');
                                }}
                                onCancel={() => setView('SCHEMA', schemaData)}
                            />
                        </div>
                    );
                case 'INVITE':
                    return <InviteForm {...props} />;
                case 'MIGRATION':
                    return <MigrationForm {...props} />;
                case 'DB_CONNECT':
                    return <DbConnectForm {...props} />;
                default:
                    return (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-6 animate-in fade-in duration-1000">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
                                <Layers size={80} className="relative z-10 text-zinc-800" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-semibold text-zinc-400">Visual Engine Standby</h3>
                                <p className="text-sm max-w-[280px] leading-relaxed">
                                    Connect a database or ask for data to activate the generative canvas.
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-8 opacity-20">
                                <Database size={24} />
                                <Table size={24} />
                                <BarChart3 size={24} />
                                <ShieldAlert size={24} />
                                <UserPlus size={24} />
                                <FileCode size={24} />
                            </div>
                        </div>
                    );
            }
        } catch (e) {
            console.error("Error rendering view:", e);
            return <div className="p-10 text-red-500">Critical View Error</div>;
        }
    };

    return (
        <div className="h-full w-full bg-zinc-950/50 glass-panel flex flex-col relative overflow-hidden m-2 rounded-2xl border border-white/5">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="flex-1 relative z-10">
                {renderView()}
            </div>

            {/* Status Bar */}
            <div className="h-8 border-t border-white/5 bg-black/40 backdrop-blur-md px-4 flex items-center justify-between text-[10px] text-zinc-500 font-mono tracking-widest relative z-20">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${currentView !== 'IDLE' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                        CORE_{currentView !== 'IDLE' ? 'ACTIVE' : 'READY'}
                    </span>
                    <span>VIEW::{currentView}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>LATENCY: 24MS</span>
                    <span>S_ID: {sId}</span>
                </div>
            </div>
        </div>
    );
}
