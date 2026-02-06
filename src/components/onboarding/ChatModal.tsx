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
import { Button } from "@/components/ui/button";
import { tamboComponents } from "@/tambo/config";

export function OnboardingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { thread, sendThreadMessage, streaming } = useTambo();
    const messages = useMemo(() => thread?.messages || [], [thread?.messages]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasGreeted = useRef(false);
    console.log("🚀 [ChatModal] Component mounted/updated", {
        isOpen,
        hasThread: !!thread,
        messageCount: messages.length,
        hasGreeted: hasGreeted.current,
        streaming
    });

    // STEP 1: When modal opens, send initial greeting to AI
    // This triggers the AI to show authentication options
    useEffect(() => {
        console.log("🔍 [ChatModal] Checking if we should greet...", {
            isOpen,
            hasGreeted: hasGreeted.current,
            messageCount: messages.length,
            threadReady: !!thread
        });

        if (isOpen && !hasGreeted.current && messages.length === 0 && thread) {
            console.log("✅ [ChatModal] All conditions met! Sending greeting...");
            hasGreeted.current = true;

            // Small delay to ensure Tambo is fully initialized
            setTimeout(() => {
                console.log("📤 [ChatModal] Sending initial message to Tambo AI...");
                try {
                    sendThreadMessage("Initialize Cortex Sequence. HIDDEN_SYS_You MUST reply with a brief, futuristic welcome message (e.g., 'Identity Protocols Active') in PLAIN TEXT ONLY (no bold/italics etc). AND execute the 'authenticate' tool immediately.");
                    console.log("✅ [ChatModal] Message sent successfully!");
                } catch (error) {
                    console.error("❌ [ChatModal] Failed to send message:", error);
                    // Suppress streaming errors - they don't affect core functionality
                    if (error instanceof Error && error.message.includes('streaming')) {
                        console.log("⚠️ [ChatModal] Streaming error suppressed - functionality continues");
                    }
                }
            }, 300);
        } else {
            console.log("⏭️ [ChatModal] Skipping greeting because:", {
                modalClosed: !isOpen,
                alreadyGreeted: hasGreeted.current,
                hasMessages: messages.length > 0,
                noThread: !thread
            });
        }
    }, [isOpen, messages, sendThreadMessage, thread]);


    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streaming]);

    // Redirection on success
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === "assistant") {
            const text = JSON.stringify(lastMessage.content);
            if (text.includes("Access granted")) {
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 2000);
            }
        }
    }, [messages]);

    const handleSend = async () => {
        const msg = input.trim();
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
                        const hasRenderableContent = (message.content as any).some((p: any) => {
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
                                {(() => {
                                    /* Handler Logic for this message scope */
                                    const handleElicitationResponse = async (response: any) => {
                                        if (response.action === "accept" && response.content) {
                                            const keys = Object.keys(response.content);
                                            const data = response.content;

                                            // Perform actual auth if it looks like login/signup
                                            if (data.email && data.password) {
                                                const { signIn, signUp } = await import("@/lib/auth-client");
                                                try {
                                                    if (data.name) {
                                                        // Signup
                                                        const { error } = await signUp.email({
                                                            email: data.email,
                                                            password: data.password,
                                                            name: data.name,
                                                        });
                                                        if (error) throw error;
                                                        await sendThreadMessage("HIDDEN_SYS_Signup successful. Identify me.");
                                                    } else {
                                                        // Login
                                                        const { error } = await signIn.email({
                                                            email: data.email,
                                                            password: data.password,
                                                        });
                                                        if (error) throw error;
                                                        await sendThreadMessage("HIDDEN_SYS_Login successful. Identify me.");
                                                    }
                                                } catch (err: any) {
                                                    await sendThreadMessage(`HIDDEN_SYS_Authentication failed: ${err.message || "Unknown error"}`);
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

                                    return (
                                        <>
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
                                                        // Check if this message already has a tool/component part
                                                        const hasRealComponent = (message.content as any).some((p: any) =>
                                                            ["tool-result", "tool_result", "component", "elicitation"].includes(p.type)
                                                        );

                                                        return (message.content as any).map((part: any, i: number) => {
                                                            if (part.type === "text") {
                                                                const text = part.text || "";
                                                                // Handle hidden system prompts (partial or full)
                                                                let displayText = text;
                                                                if (text.includes("HIDDEN_SYS_")) {
                                                                    const parts = text.split("HIDDEN_SYS_");
                                                                    displayText = parts[0].trim();
                                                                    if (!displayText) return null; // Fully hidden
                                                                }
                                                                const trimmed = displayText.trim();


                                                                // Handle potential raw JSON that should be a component
                                                                if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                                                                    try {
                                                                        const data = JSON.parse(trimmed);
                                                                        // Explicit mapping for known tool outputs that appear as text
                                                                        if (data.action === "CHOOSE_AUTH" || data.action === "REDIRECT_LOGIN" || data.action === "REDIRECT_SIGNUP") {
                                                                            console.log("[ChatModal] Detected JSON Text Action:", data.action);
                                                                            const authComponent = tamboComponents.find(c => c.name === "authenticate");
                                                                            if (authComponent) {
                                                                                const Component = authComponent.component;
                                                                                return (
                                                                                    <div key={i} className="mt-4 flex justify-start w-full overflow-hidden border-t border-white/5 pt-4">
                                                                                        {/* @ts-ignore */}
                                                                                        <Component action={data.action} />
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        }
                                                                    } catch (e) {
                                                                        // invalid json, ignore
                                                                    }
                                                                    // Hide other raw JSON
                                                                    return null;
                                                                }

                                                                if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                                                                    // ... existing JSON logic ...
                                                                }

                                                                // Fallback for NLP responses that imply tool usage but miss the call
                                                                const lowerText = trimmed.toLowerCase();
                                                                // flexible detection: if it mentions login/signup in this context, it's likely an attempt
                                                                const isLoginIntent = lowerText.includes("login") || lowerText.includes("sign in") || lowerText.includes("credential");
                                                                const isSignupIntent = lowerText.includes("account") || lowerText.includes("sign up") || lowerText.includes("register") || lowerText.includes("join");

                                                                if (message.role === 'assistant' && !hasRealComponent && (isLoginIntent || isSignupIntent)) {
                                                                    console.log("[ChatModal] Detected NLP Intent:", isLoginIntent ? "login" : "signup");
                                                                    const toolName = isLoginIntent ? "login" : "signup";
                                                                    const config = tamboComponents.find(c => c.name === toolName);

                                                                    if (config) {
                                                                        const Component = config.component;
                                                                        // Mock params for ElicitationUI
                                                                        const mockParams = {
                                                                            message: isLoginIntent ? "Enter your email and password to access the system." : "Enter your details to create a new Cortex identity.",
                                                                            requestedSchema: {
                                                                                type: "object",
                                                                                properties: isLoginIntent
                                                                                    ? { email: { type: "string" }, password: { type: "string" } }
                                                                                    : { name: { type: "string" }, email: { type: "string" }, password: { type: "string" } },
                                                                                required: isLoginIntent ? ["email", "password"] : ["name", "email", "password"]
                                                                            }
                                                                        };
                                                                        return (
                                                                            <div key={i}>
                                                                                <p className="whitespace-pre-wrap">{displayText}</p>
                                                                                <div className="mt-4 flex justify-start w-full overflow-hidden border-t border-white/5 pt-4">
                                                                                    {/* @ts-ignore */}
                                                                                    <Component {...mockParams} request={mockParams} onResponse={handleElicitationResponse} />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                }

                                                                if (!trimmed) return null;
                                                                return <p key={i} className="whitespace-pre-wrap">{displayText}</p>;
                                                            }

                                                            // Handle elicitation or tool components
                                                            if (part.type === "tool-result" || part.type === "tool_result" || part.type === "component" || part.type === "elicitation") {
                                                                const isElicitation = part.type === "elicitation" || part.name === "elicitation";
                                                                const name = isElicitation ? "elicitation" : (part.toolName || part.name);
                                                                const props = isElicitation ? part : (part.result || part.content || part.props);

                                                                const componentConfig = tamboComponents.find(c => c.name === name);
                                                                if (componentConfig) {
                                                                    console.log("[ChatModal] Successfully found component:", name);
                                                                } else {
                                                                    console.log("[ChatModal] Failed to find component:", name, "Available:", tamboComponents.map(c => c.name));
                                                                    // Fallback: Show raw part to debug
                                                                    return (
                                                                        <div key={i} className="mt-2 p-2 bg-red-500/10 border border-red-500/50 rounded text-red-200 text-xs font-mono overflow-auto max-w-full">
                                                                            <p className="font-bold border-b border-red-500/20 mb-1 pb-1">DEBUG: Component '{name}' not found.</p>
                                                                            <pre className="whitespace-pre-wrap">{JSON.stringify(part, null, 2)}</pre>
                                                                        </div>
                                                                    );
                                                                }

                                                                if (componentConfig && props) {
                                                                    const Component = componentConfig.component;
                                                                    return (
                                                                        <div key={i} className="mt-4 flex justify-start w-full overflow-hidden border-t border-white/5 pt-4">
                                                                            <Component
                                                                                {...props}
                                                                                request={props} // For ElicitationUI
                                                                                onResponse={handleElicitationResponse} // For ElicitationUI
                                                                            />
                                                                        </div>
                                                                    );
                                                                }

                                                                if (props && typeof props === 'object') {
                                                                    return (
                                                                        <div key={i} className="mt-2 p-2 bg-white/5 rounded-lg border border-white/5 font-mono text-[10px] overflow-auto max-h-[150px]">
                                                                            <pre>{JSON.stringify(props, null, 2)}</pre>
                                                                        </div>
                                                                    );
                                                                }
                                                            }
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
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
                                        handleSend();
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
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your response..."
                            className="flex-1 bg-transparent text-white px-3 py-2 focus:outline-none placeholder:text-zinc-600 text-sm"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || streaming}
                            className="bg-white text-black p-2 rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-20 transition-all"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
