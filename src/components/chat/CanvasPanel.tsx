"use client";

import { useCortexStore } from "@/lib/store";
import { SchemaCanvas } from "@/components/cortex/SchemaCanvas";
import { SmartTable } from "@/components/cortex/SmartTable";
import { SmartChart } from "@/components/cortex/SmartChart";
import { MigrationForm } from "@/components/cortex/MigrationForm";
import { DbConnectForm } from "@/components/cortex/DbConnectForm";
import { GhostModeModal } from "@/components/cortex/GhostModeModal";
import { InviteForm } from "@/components/cortex/InviteForm";
import { Layers, Database, Table, BarChart3, ShieldAlert, UserPlus, FileCode } from "lucide-react";

export function CanvasPanel() {
    // We'll create the store in the next step, but let's assume it exists
    // For now, if store is missing, we'll show a placeholder.
    let currentView = 'IDLE';
    let data: any = null;

    try {
        const store = useCortexStore();
        currentView = store.currentView;
        data = store.data;
    } catch (e) {
        // Store not created yet
    }

    const renderView = () => {
        switch (currentView) {
            case 'SCHEMA':
                return <SchemaCanvas {...data} />;
            case 'TABLE':
                return <SmartTable {...data} />;
            case 'CHART':
                return <SmartChart {...data} />;
            case 'GHOST_MODE':
                return <GhostModeModal {...data} />;
            case 'INVITE':
                return <InviteForm {...data} />;
            case 'MIGRATION':
                return <MigrationForm {...data} />;
            case 'DB_CONNECT':
                return <DbConnectForm {...data} />;
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
    };

    return (
        <div className="h-full w-full bg-zinc-950 flex flex-col relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="flex-1 relative z-10">
                {renderView()}
            </div>

            {/* Status Bar */}
            <div className="h-8 border-t border-white/5 bg-black/40 backdrop-blur-md px-4 flex items-center justify-between text-[10px] text-zinc-500 font-mono tracking-widest relative z-20">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        CORE_READY
                    </span>
                    <span>VIEW::{currentView}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>LATENCY: 24MS</span>
                    <span>S_ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                </div>
            </div>
        </div>
    );
}
