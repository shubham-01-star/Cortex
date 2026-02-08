"use client";

import { Lightbulb, Shield, User, Bot, Sparkles } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SuggestionsDropdownProps {
    role: "admin" | "user";
}

export function SuggestionsDropdown({ role }: SuggestionsDropdownProps) {
    const suggestions =
        role === "admin"
            ? [
                {
                    id: 1,
                    text: "I need a complete system health report.",
                    icon: <Shield size={14} />,
                },
                {
                    id: 2,
                    text: "Show my official administrative profile.",
                    icon: <User size={14} />,
                },
                {
                    id: 3,
                    text: "Are there any infrastructure anomalies?",
                    icon: <Shield size={14} />,
                },
            ]
            : [
                {
                    id: 1,
                    text: "Identify me and show my profile.",
                    icon: <User size={14} />,
                },
                {
                    id: 2,
                    text: "Access restricted system diagnostics.",
                    icon: <Shield size={14} />,
                },
                {
                    id: 3,
                    text: "What are my current platform permissions?",
                    icon: <Shield size={14} />,
                },
            ];

    const handleSelect = (text: string) => {
        // Dispatch custom event to populate input (same mechanism as before)
        const event = new CustomEvent("populateInput", {
            detail: text,
        });
        console.log("Dispatching populateInput", text);
        window.dispatchEvent(event);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button suppressHydrationWarning className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium border border-indigo-500/20 transition-all">
                    <Sparkles size={12} />
                    <span>Suggestions</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 bg-zinc-950/95 backdrop-blur-xl border-white/10 text-zinc-200" align="end">
                <DropdownMenuLabel className="flex items-center gap-2 text-zinc-100">
                    <Lightbulb size={16} className="text-yellow-500" />
                    Suggested Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuGroup className="p-1 gap-1 flex flex-col">
                    {suggestions.map((item) => (
                        <DropdownMenuItem
                            key={item.id}
                            className="flex items-start gap-3 p-3 focus:bg-white/5 focus:text-white cursor-pointer rounded-lg"
                            onSelect={() => handleSelect(item.text)}
                        >
                            <div className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                                {item.icon}
                            </div>
                            <div>
                                <span className="font-medium text-sm block">{item.text}</span>
                                <span className="text-[10px] text-zinc-500 block mt-0.5">Click to ask</span>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/10" />
                <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 m-1 rounded-lg border border-indigo-500/10">
                    <p className="text-[10px] text-indigo-300/80 leading-relaxed font-medium">
                        <span className="text-indigo-200 block mb-1">Pro Tip</span>
                        {role === "admin"
                            ? "Try asking to 'Analyze system stats with verbose mode' to get a deeper breakdown of infrastructure performance."
                            : "Try asking 'Access system health' to see how the RBAC security layer blocks unauthorized requests."}
                    </p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                    className="flex items-center gap-2 p-2 text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10 cursor-pointer rounded-lg text-xs"
                    onSelect={() => {
                        localStorage.removeItem("cortex_mock_genesis_completed");
                        window.location.reload();
                    }}
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Reset Mock State (Dev)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
