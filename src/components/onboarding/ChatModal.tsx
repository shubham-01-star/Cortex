"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTambo } from "@tambo-ai/react";
import {
    X,
    Sparkles,
    Send,
    Bot,
    User as UserIcon,
    Loader2,
    LogIn,
    UserPlus,
    HelpCircle
} from "lucide-react";
import { tamboComponents } from "@/tambo/config";

interface MessagePart {
    type: string;
    text?: string;
    toolName?: string;
    name?: string;
    result?: unknown;
    content?: unknown;
    props?: unknown;
}

export function OnboardingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { thread, sendThreadMessage, streaming } = useTambo();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = useMemo(() => (thread?.messages || []) as any[], [thread?.messages]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasGreeted = useRef(false);

    const handleElicitationResponse = useMemo(() => {
        return async (response: { action: string; content?: Record<string, string> }) => {
            if (response.action === "accept" && response.content) {
                const data = response.content;
                const keys = Object.keys(data);

                if (data.email && data.password) {
                    const { signIn, signUp } = await import("@/server/auth/auth-client");
                    try {
                        if (data.name) {
                            // Signup flow
                            const { error } = await signUp.email({
                                email: data.email,
                                password: data.password,
                                name: data.name,
                            });
                            if (error) throw error;

                            // Success! Redirect to dashboard
                            setTimeout(() => {
                                window.location.href = "/dashboard";
                            }, 500);
                        } else {
                            // Login flow
                            const { error } = await signIn.email({
                                email: data.email,
                                password: data.password,
                            });
                            if (error) throw error;

                            // Success! Redirect to dashboard
                            setTimeout(() => {
                                window.location.href = "/dashboard";
                            }, 500);
                        }
                    } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : "Unknown error";
                        await sendThreadMessage(`Authentication failed: ${message}. Please try again.`);
                    }
                    return;
                }

                if (keys.length === 1) {
                    await sendThreadMessage(String(data[keys[0]]));
                } else if (keys.length > 1) {
                    await sendThreadMessage(JSON.stringify(data));
                }
            }
        };
    }, [sendThreadMessage]);

    // STEP 1: When modal opens, send initial greeting to AI
    useEffect(() => {
        if (isOpen && !hasGreeted.current && messages.length === 0 && thread) {
            hasGreeted.current = true;

            setTimeout(() => {
                try {
                    sendThreadMessage("Hello. Please help me log in or sign up. HIDDEN_SYS_You MUST reply with a brief, professional welcome message (e.g., 'System ready.') in PLAIN TEXT ONLY (no bold/italics etc). AND execute the 'authenticate' tool immediately.");
                } catch (error) {
                    console.error("❌ [ChatModal] Failed to send message:", error);
                }
            }, 300);
        }
    }, [isOpen, messages.length, sendThreadMessage, thread]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streaming]);

    const handleSend = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg) return;
        setInput("");
        await sendThreadMessage(msg);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-900 w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[80vh] relative">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Sparkles size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-tight">Cortex Onboarding</h3>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">System Initialization</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
                >
                    {messages.map((message, idx) => {
                        const contentParts = (message.content || []) as MessagePart[];
                        const hasRenderableContent = contentParts.some((p: MessagePart) => {
                            if (p.type === "text") {
                                const txt = p.text?.trim();
                                return txt && !txt.startsWith("HIDDEN_SYS_");
                            }
                            return ["component", "elicitation"].includes(p.type);
                        });

                        if (!hasRenderableContent) return null;

                        return (
                            <div
                                key={message.id || idx}
                                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                {/* Hoisted Elicitation Handler */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${message.role === 'user' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-indigo-600 border-indigo-500 text-white'
                                    }`}>
                                    {message.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                                </div>
                                <div className={`max-w-[80%] space-y-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    <div className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${message.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white/5 text-zinc-200 border border-white/10'
                                        }`}>
                                        {(() => {
                                            const hasRealComponent = contentParts.some((p: MessagePart) =>
                                                ["tool-result", "tool_result", "component", "elicitation"].includes(p.type)
                                            );

                                            // Track seen text to prevent duplicates
                                            const seenTexts = new Set<string>();

                                            return contentParts.map((part: MessagePart, i: number) => {
                                                if (part.type === "text") {
                                                    const text = part.text || "";
                                                    let displayText = text;
                                                    if (text.includes("HIDDEN_SYS_")) {
                                                        const parts = text.split("HIDDEN_SYS_");
                                                        displayText = parts[0].trim();
                                                        if (!displayText) return null;
                                                    }
                                                    const trimmed = displayText.trim();

                                                    // Deduplicate: skip if we've already seen this exact text
                                                    if (seenTexts.has(trimmed)) {
                                                        return null;
                                                    }
                                                    seenTexts.add(trimmed);

                                                    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                                                        try {
                                                            const data = JSON.parse(trimmed);
                                                            if (data.action === "CHOOSE_AUTH" || data.action === "REDIRECT_LOGIN" || data.action === "REDIRECT_SIGNUP") {
                                                                const authComponent = tamboComponents.find(c => c.name === "authenticate");
                                                                if (authComponent) {
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    const Component = authComponent.component as any;
                                                                    return (
                                                                        <div key={i} className="mt-4 flex justify-start w-full overflow-hidden border-t border-white/5 pt-4">
                                                                            <Component action={data.action} />
                                                                        </div>
                                                                    );
                                                                }
                                                            }
                                                        } catch {
                                                            // silence
                                                        }
                                                        return null;
                                                    }

                                                    const lowerText = trimmed.toLowerCase();
                                                    const isLoginIntent = lowerText.includes("login") || lowerText.includes("sign in") || lowerText.includes("log in");
                                                    const isSignupIntent = lowerText.includes("account") || lowerText.includes("sign up");

                                                    if (message.role === 'assistant' && !hasRealComponent && (isLoginIntent || isSignupIntent)) {
                                                        const toolName = isLoginIntent ? "login" : "signup";
                                                        const config = tamboComponents.find(c => c.name === toolName);

                                                        if (config) {
                                                            const Component = config.component;
                                                            const mockParams = {
                                                                message: isLoginIntent ? "Enter credentials" : "Create identity",
                                                                requestedSchema: {
                                                                    type: "object",
                                                                    properties: isLoginIntent
                                                                        ? {
                                                                            email: { type: "string", format: "email" },
                                                                            password: { type: "string", format: "password" }
                                                                        }
                                                                        : {
                                                                            name: { type: "string" },
                                                                            email: { type: "string", format: "email" },
                                                                            password: { type: "string", format: "password" }
                                                                        },
                                                                    required: isLoginIntent ? ["email", "password"] : ["name", "email", "password"]
                                                                }
                                                            };
                                                            return (
                                                                <div key={i}>
                                                                    <p className="whitespace-pre-wrap">{displayText}</p>
                                                                    <div className="mt-4 flex justify-start w-full overflow-hidden border-t border-white/5 pt-4">
                                                                        {/* @ts-expect-error - dynamic internal component props */}
                                                                        <Component {...mockParams} request={mockParams} onResponse={handleElicitationResponse} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    }

                                                    if (!trimmed) return null;
                                                    return <p key={i} className="whitespace-pre-wrap">{displayText}</p>;
                                                }

                                                if (["tool-result", "tool_result", "component", "elicitation"].includes(part.type)) {
                                                    const isElicitation = part.type === "elicitation" || part.name === "elicitation";
                                                    const name = isElicitation ? "elicitation" : (part.toolName || part.name || "");
                                                    const props = (isElicitation ? part : (part.result || part.content || part.props)) as Record<string, unknown>;

                                                    console.log("🔍 [ChatModal] Component part detected:", { type: part.type, name, isElicitation, hasProps: !!props });

                                                    const componentConfig = tamboComponents.find(c => c.name === name);
                                                    console.log("🔍 [ChatModal] Component config:", { name, found: !!componentConfig });
                                                    if (componentConfig && props) {
                                                        const Component = componentConfig.component;
                                                        console.log("✅ [ChatModal] Rendering component:", name, props);
                                                        return (
                                                            <div key={i} className="mt-4 flex justify-start w-full overflow-hidden border-t border-white/5 pt-4">
                                                                <Component
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    {...(props as any)}
                                                                    request={props}
                                                                    onResponse={handleElicitationResponse}
                                                                />
                                                            </div>
                                                        );
                                                    }

                                                    console.log("⚠️ [ChatModal] Component not found or no props:", { name, hasConfig: !!componentConfig, hasProps: !!props });
                                                    // Don't render raw JSON - it reveals API responses
                                                    // Component not found, skip rendering
                                                }
                                                return null;
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {streaming && (
                        <div className="flex gap-4 animate-pulse">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                                <Loader2 size={14} className="text-indigo-400 animate-spin" />
                            </div>
                            <div className="bg-white/5 w-16 h-8 rounded-full border border-white/5" />
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                {
                    messages.length > 0 && !streaming && (
                        <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar">
                            {[
                                { label: "Login", icon: <LogIn size={12} />, text: "I want to login" },
                                { label: "Sign Up", icon: <UserPlus size={12} />, text: "I want to create an account" },
                                { label: "Help", icon: <HelpCircle size={12} />, text: "What can you do?" }
                            ].map((action) => (
                                <button
                                    key={action.label}
                                    onClick={() => {
                                        setInput(action.text);
                                        handleSend(action.text);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold text-zinc-400 hover:text-white transition-all whitespace-nowrap"
                                >
                                    {action.icon}
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )
                }

                {/* Input */}
                <div className="p-4 bg-zinc-900 border-t border-white/5">
                    <div className="flex gap-2 items-center bg-white/5 border border-white/10 p-1.5 rounded-2xl focus-within:border-indigo-500/50 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
                            placeholder="Type your response..."
                            className="flex-1 bg-transparent text-white px-3 py-2 focus:outline-none placeholder:text-zinc-600 text-sm"
                        />
                        <button
                            onClick={() => void handleSend()}
                            disabled={!input.trim() || streaming}
                            className="bg-white text-black p-2 rounded-full hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
