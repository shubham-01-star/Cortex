"use client";

import { ShieldAlert, Lock, AlertTriangle } from "lucide-react";

interface AccessDeniedProps {
    reason?: string;
    className?: string;
}

export function AccessDenied({ reason = "Insufficient Permissions", className }: AccessDeniedProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-6 border border-red-500/20 bg-red-950/10 rounded-lg text-center ${className}`}>
            <div className="p-3 bg-red-500/10 rounded-full mb-4 animate-pulse">
                <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-red-500 mb-2">Access Denied</h3>
            <p className="text-zinc-400 max-w-sm text-sm">
                {reason}. This action requires higher privileges.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                <ShieldAlert className="w-3 h-3" />
                <span>Security Protocol Executed</span>
            </div>
        </div>
    );
}
