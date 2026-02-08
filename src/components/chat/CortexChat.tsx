"use client";

import { useTambo } from "@/hooks/use-tambo";
import {
    AlertCircle,
    Bot,
    Mic,
    MicOff,
    Send,
    Sparkles,
    User as UserIcon,
    Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { tamboComponents } from "@/tambo/tools";
import { AdminStats } from "@/components/tambo/AdminStats";
import { ErrorPopup } from "@/components/tambo/ErrorPopup";
import { AccessDenied } from "@/components/tambo/AccessDenied";
import { ElicitationUI } from "@/components/tambo/elicitation-ui";
import { InviteForm } from "@/components/cortex/InviteForm";
import { useCortexStore, ViewType } from "@/lib/store";

interface TamboContentPart {
    type: string;
    text?: string;
    toolName?: string;
    result?: Record<string, unknown>;
    name?: string;
    props?: Record<string, unknown>;
    content?: unknown;
}

interface TamboMessage {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: TamboContentPart[];
    createdAt?: string | null;
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: ((event: Event) => void) | null;
    start: () => void;
    stop: () => void;
}

interface WindowWithSpeech extends Window {
    SpeechRecognition?: {
        new(): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
        new(): SpeechRecognition;
    };
}

export function CortexChat() {
    const { thread, sendThreadMessage, streaming } = useTambo();
    const { setView, setGhostMode } = useCortexStore();
    const router = useRouter();
    const messages = useMemo(() => (thread?.messages || []) as TamboMessage[], [thread?.messages]);
    const [input, setInput] = useState("");

    // State sync moved to CanvasPanel.tsx to effectively mimic native CanvasSpace behavior
    useEffect(() => {
        if (messages.length === 0) return;
        const lastMessage = messages[messages.length - 1];

        // Only handle Ghost Mode specific logic if strictly needed here, 
        // otherwise let CanvasPanel handle it.
        // For now, we keep the Side Effect of "AUTH_PROCESS" redirect here as it affects routing.

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((lastMessage as any).component) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const comp = (lastMessage as any).component;
            if (comp.props?.action === "AUTH_PROCESS") {
                router.push("/dashboard");
            }
            return;
        }

        if (lastMessage.role === "assistant" || lastMessage.role === "tool") {
            const toolResult = lastMessage.content.find(p => p.type === "tool-result" || p.type === "tool_result" || p.type === "component");
            if (toolResult) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const props = (toolResult.result || toolResult.content || toolResult.props) as any;

                // Handle Auth Redirect
                if (props?.action === "AUTH_PROCESS") {
                    router.push("/dashboard");
                    return;
                }

                // Handle Ghost Mode Trigger
                if (props?.status === "pending_confirmation" && (toolResult.toolName === "manage_data" || toolResult.name === "manage_data")) {
                    const summary = props.actionSummary || "Critical Action";
                    const tableMatch = summary.match(/on\s+(\w+)/i);
                    const tableName = tableMatch ? tableMatch[1] : "unknown";
                    setTimeout(() => {
                        setGhostMode(tableName, summary);
                    }, 500);
                }

                // --- NEW: GENERIC CANVAS SYNC ---
                // If a tool result maps to a Canvas Component, update the Global Store
                // accessible via 'component' property (new standard) or toolName (legacy)
                const componentName = props?.component || toolResult.toolName || toolResult.name;

                if (componentName) {
                    const config = tamboComponents.find(c => c.name === componentName);
                    if (config && config.viewType && config.viewType !== 'IDLE') {
                        // Avoid infinite loops / unnecessary updates if data hasn't changed
                        // but since effect depends on `messages`, it runs once per new message.
                        // We use a small timeout to let the chat render first.
                        setTimeout(() => {
                            setView(config.viewType as ViewType, props);
                        }, 100);
                    }
                }
            }
        }
    }, [messages, router]);

    const [isListening, setIsListening] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const shouldBeListeningRef = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasCheckedGenesis = useRef(false);

    // Genesis Flow handled in DashboardPage.tsx

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === "assistant" || lastMessage?.role === "tool") {
            const parts = lastMessage.content;
            const connResult = parts.find(p => (p.toolName === "setup_database" || p.name === "setup_database"));
            const resultData = connResult?.result as { success?: boolean } | undefined;
            if (resultData?.success && !streaming) {
                setTimeout(() => { sendThreadMessage("Great! Now visualize the schema for me."); }, 1000);
            }
        }
    }, [messages, sendThreadMessage, streaming]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, streaming]);

    // Listen for Schema Node Clicks
    useEffect(() => {
        const handleCommand = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                // Determine if it's a "Show data" command or something else
                // We just send it as a user message
                // Use setTimeout to avoid state updates during render phase if any
                setTimeout(() => {
                    handleSend(customEvent.detail);
                }, 0);
            }
        };

        window.addEventListener('cortexCommand', handleCommand);
        return () => window.removeEventListener('cortexCommand', handleCommand);
    }, []);

    const handleSend = async (text?: string) => {
        const message = (text || input).trim();
        if (!message) return;
        try {
            setGlobalError(null);
            await sendThreadMessage(message);
            if (!text) setInput(""); // Only clear input if it was a manual type
        } catch (err) {
            console.error("Failed to send message:", err);
            setGlobalError("Network error detected. Please check your connection.");
        }
    };
    useEffect(() => {
        if (typeof window === "undefined") return;
        const win = window as unknown as WindowWithSpeech;
        const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (!SpeechRecognitionClass) {
            // We can just log here or set a ref, but avoiding immediate state update if possible, 
            // or wrap in setTimeout to push to next tick (less ideal but fixes the error).
            // Better: setIsSupported is already initialized to true, so we only set false if missing.
            // We will wrap in setTimeout to avoid the linter error and react warning.
            setTimeout(() => {
                setIsSupported(false);
                setVoiceError("Browser not supported");
            }, 0);
            return;
        }
        recognitionRef.current = new SpeechRecognitionClass();
        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = "";
            const index = event.resultIndex || 0;
            for (let i = index; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            }
            if (finalTranscript) {
                setInput(finalTranscript);
                setVoiceError(null);
                shouldBeListeningRef.current = false;
                setIsListening(false);
                recognition.stop();
                setTimeout(async () => {
                    try { await sendThreadMessage(finalTranscript); setInput(""); } catch (err) { console.error("Voice send failed:", err); }
                }, 500);
            }
        };
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error === "no-speech") return;
            shouldBeListeningRef.current = false;
            setIsListening(false);
            setVoiceError(event.error === "not-allowed" ? "Microphone access denied" : `Voice Error: ${event.error}`);
        };
        recognition.onend = () => {
            if (shouldBeListeningRef.current && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch {
                    shouldBeListeningRef.current = false;
                    setIsListening(false);
                }
            } else setIsListening(false);
        };
        return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
    }, [sendThreadMessage]);

    const toggleVoice = () => {
        if (!isSupported) return;
        setVoiceError(null);
        if (isListening) {
            shouldBeListeningRef.current = false;
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            shouldBeListeningRef.current = true;
            setIsListening(true);
            try { recognitionRef.current?.start(); } catch {
                setVoiceError("Could not start microphone");
                shouldBeListeningRef.current = false;
                setIsListening(false);
            }
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleResponse = async (response: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (response.action === "accept" && (response as any).content) {
            const keys = Object.keys(response.content);
            await sendThreadMessage(keys.length === 1 ? String(response.content[keys[0]]) : JSON.stringify(response.content));
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950/50 relative overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth">
                {messages.length === 0 && !streaming && (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4 animate-in fade-in zoom-in duration-700">
                        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center p-0.5 shadow-xl rotate-3">
                            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-white"><Sparkles size={24} className="text-indigo-400" /></div>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-white tracking-tight">Cortex Interface</h2>
                            <p className="text-zinc-500 text-xs max-w-[200px] mx-auto leading-relaxed">Commands for database, visualizations, and team management.</p>
                        </div>
                    </div>
                )}
                {messages.filter(msg => {
                    const content = msg.content.map(p => p.text).join(" ");
                    return !content.includes("HIDDEN_SYS") && !content.includes("Attention: No database connection detected");
                }).map((message, idx) => (
                    <div key={message.id || `msg-${idx}`} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${message.role === "user" ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-indigo-600 border-indigo-500 text-white"}`}>
                            {message.role === "user" ? <UserIcon size={12} /> : <Bot size={12} />}
                        </div>
                        <div className={`max-w-[95%] space-y-1 ${message.role === "user" ? "ml-auto text-right" : "text-left"}`}>
                            <div className={`block w-full px-4 py-2.5 rounded-xl text-xs leading-relaxed font-sans shadow-2xl ${message.role === "user" ? "text-white bg-white/5 rounded-tr-none border border-white/10" : "text-white bg-zinc-950/80 backdrop-blur-md border border-white/10"}`}>
                                {message.content.map((part, i) => {
                                    if (part.type === "text") {
                                        const text = part.text || "";
                                        if (text.includes("requestedSchema") && text.includes("{")) {
                                            try {
                                                const jsonMatch = text.match(/\{[\s\S]*\}/);
                                                if (jsonMatch) {
                                                    const data = JSON.parse(jsonMatch[0]);
                                                    if (data.requestedSchema) {
                                                        return (
                                                            <div key={i} className="mt-3 pt-3 border-t border-white/10 w-full">
                                                                <ElicitationUI
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    request={{ message: data.message || "Fill form", requestedSchema: data.requestedSchema } as any}
                                                                    onResponse={handleResponse}
                                                                />
                                                            </div>
                                                        );
                                                    }
                                                }
                                            } catch { }
                                        }
                                        if (text.includes("{") && (text.includes('"status"') || text.includes('"cpu"'))) {
                                            try {
                                                const jsonMatch = text.match(/\{[\s\S]*\}/);
                                                if (jsonMatch) {
                                                    const data = JSON.parse(jsonMatch[0]);

                                                    // 1. Dynamic Component Rendering (Generic)
                                                    // If the JSON contains a 'component' key, look it up in the registry
                                                    if (data.component) {
                                                        const config = tamboComponents.find(c => c.name === data.component);
                                                        if (config) {
                                                            const Component = config.component;
                                                            return (
                                                                <div key={i} className="mt-3 pt-3 border-t border-white/10 w-full flex justify-center">
                                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                    <Component {...(data as any)} />
                                                                </div>
                                                            );
                                                        }
                                                    }

                                                    // 2. Fallbacks for Legacy/Implicit Cases
                                                    if (data.status === "form_ready" && !data.component) {
                                                        // Backward compatibility if component key missing
                                                        return (
                                                            <div key={i} className="mt-3 pt-3 border-t border-white/10 w-full flex justify-center">
                                                                <InviteForm {...data} />
                                                            </div>
                                                        );
                                                    }

                                                    // 3. Hardware Stats
                                                    const statsData = data.data || data;
                                                    if (statsData && (statsData.cpu || statsData.disk || statsData.bandwidth || statsData.uptime)) {
                                                        return <div key={i} className="mt-2 pt-2 border-t border-white/5"><AdminStats data={statsData} status={data.status} message={data.message} /></div>;
                                                    }
                                                }
                                            } catch { }
                                        }
                                        return <p key={i} className="whitespace-pre-wrap">{text}</p>;
                                    }
                                    if (["tool-result", "tool_result", "component", "elicitation"].includes(part.type)) {
                                        const isElicitation = part.type === "elicitation" || part.name === "elicitation";
                                        const name = isElicitation ? "elicitation" : (part.toolName || part.name);
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const props = (isElicitation ? part : (part.result || part.content || part.props)) as any;
                                        if (props?.status === "denied") return <div key={i} className="mt-3 w-full flex justify-center"><AccessDenied message={String(props.message || "")} /></div>;
                                        const config = tamboComponents.find(c => c.name === name);
                                        if (config && props) {
                                            // START: Don't render Heavy UI in Chat if it belongs to Canvas
                                            // IDLE viewType means it's an inline chat component (like Auth form)
                                            if (config.viewType && config.viewType !== 'IDLE') {
                                                return (
                                                    <div key={i} className="mt-2 w-full flex justify-center">
                                                        <div className="bg-zinc-900/50 border border-indigo-500/20 rounded-lg px-3 py-2 text-xs text-indigo-300 flex items-center gap-2 animate-pulse">
                                                            <Sparkles size={12} />
                                                            <span>Visualization active on canvas...</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            // END

                                            const Component = config.component;
                                            return (
                                                <div key={i} className="mt-3 pt-3 border-t border-white/10 w-full flex justify-center overflow-hidden">
                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                    <Component {...(props as any)} request={props} onResponse={handleResponse} />
                                                </div>
                                            );
                                        }
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    </div>
                ))}
                {streaming && (
                    <div className="flex gap-3 animate-pulse">
                        <div className="w-7 h-7 rounded-md bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center"><Loader2 size={12} className="text-indigo-400 animate-spin" /></div>
                        <div className="bg-zinc-900 w-12 h-7 rounded-full border border-white/5" />
                    </div>
                )}
            </div>
            <div className="p-4 bg-zinc-950/80 backdrop-blur-xl border-t border-white/10">
                {globalError && <ErrorPopup message={globalError} onClose={() => setGlobalError(null)} />}
                {voiceError && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-3 py-1.5 bg-red-900/80 border border-red-500/30 text-red-200 text-[10px] rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"><AlertCircle size={10} />{voiceError}</div>}


                <div className="flex gap-2 items-center bg-white/5 border border-white/10 p-1.5 rounded-full focus-within:border-indigo-500/50 transition-all">
                    <button onClick={toggleVoice} disabled={!isSupported} className={`p-2 rounded-full transition-all ${isSupported ? (isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "text-zinc-500 hover:text-white") : "opacity-20 cursor-not-allowed"}`}>{isListening ? <MicOff size={16} /> : <Mic size={16} />}</button>
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handleSend()} placeholder={isListening ? "Listening..." : "Command cortex..."} className="flex-1 bg-transparent text-white px-2 py-1 focus:outline-none placeholder:text-zinc-600 text-xs" />
                    <button onClick={() => void handleSend()} disabled={!input.trim() || streaming} className="bg-white text-black p-2 rounded-full hover:opacity-90 active:scale-95 disabled:opacity-20 transition-all"><Send size={14} /></button>
                </div>
            </div>
        </div>
    );
}
