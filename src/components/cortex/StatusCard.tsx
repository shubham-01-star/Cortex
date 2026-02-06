"use client";

import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface StatusCardProps {
    status: "connected" | "connecting" | "error";
    message?: string;
    provider?: string;
}

export function StatusCard({ status, message, provider }: StatusCardProps) {
    return (
        <div className="w-full max-w-md mx-auto p-6 bg-zinc-900/50 border border-white/10 rounded-2xl backdrop-blur-sm animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-4">
                {status === "connected" && (
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                )}
                {status === "connecting" && (
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                )}
                {status === "error" && (
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-500" />
                    </div>
                )}

                <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">
                        {status === "connected" && "Database Connected"}
                        {status === "connecting" && "Connecting..."}
                        {status === "error" && "Connection Failed"}
                    </h3>
                    <p className="text-zinc-400 text-xs mt-1">
                        {message || (status === "connected" ? `${provider || "Database"} is now active` : "")}
                    </p>
                </div>
            </div>

            {status === "connected" && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Status</span>
                        <span className="text-emerald-500 font-mono">ACTIVE</span>
                    </div>
                </div>
            )}
        </div>
    );
}
