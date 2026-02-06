"use client";

import { useTambo } from "@tambo-ai/react";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { tamboComponents } from "@/tambo/tools";
import { AdminStats } from "@/components/tambo/AdminStats";
import { ErrorPopup } from "@/components/tambo/ErrorPopup";
import { UserCard } from "@/components/tambo/UserCard";
import { AccessDenied } from "@/components/tambo/AccessDenied";
import { ElicitationUI } from "@/components/tambo/elicitation-ui";
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
    const { setView } = useCortexStore();
    const messages = useMemo(() => thread?.messages || [], [thread?.messages]);
    const [input, setInput] = useState("");

    // Sync logic: Listen for tool results and update Canvas
    useEffect(() => {
        if (messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "assistant" || lastMessage.role === "tool") {
            const contentParts = lastMessage.content as TamboContentPart[];
            const toolResult = contentParts.find(p => p.type === "tool-result" || p.type === "tool_result" || p.type === "component");

            if (toolResult) {
                const name = toolResult.toolName || toolResult.name;
                const props = toolResult.result || toolResult.content || toolResult.props;
                const config = tamboComponents.find(c => c.name === name);

                if (config && config.viewType && config.viewType !== 'IDLE') {
                    setView(config.viewType as ViewType, props);
                }
            }
        }
    }, [messages, setView]);
    const [isListening, setIsListening] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const shouldBeListeningRef = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasCheckedGenesis = useRef(false);

    // Genesis Flow Trigger
    useEffect(() => {
        if (hasCheckedGenesis.current) return;
        hasCheckedGenesis.current = true;

        const checkGenesis = async () => {
            const { checkConnection } = await import("@/actions/connection-tools");
            const { isConfigured } = await checkConnection();

            if (!isConfigured && (!thread?.messages || thread.messages.length === 0)) {
                await sendThreadMessage("The system detected no database connection. Please help me connect one.");
            }
        };

        checkGenesis();
    }, [thread?.messages, sendThreadMessage]);

    // Automatic Schema Visualization after connection
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === "assistant" || lastMessage?.role === "tool") {
            const parts = lastMessage.content as TamboContentPart[];
            const connResult = parts.find(p => (p.toolName === "setup_database" || p.name === "setup_database") && (p.result as any)?.success);

            if (connResult && !streaming) {
                // Trigger visualization
                setTimeout(() => {
                    sendThreadMessage("Great! Now visualize the schema for me.");
                }, 1000);
            }
        }
    }, [messages, sendThreadMessage, streaming]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streaming]);

    // Listen for suggestions click or visual commands
    useEffect(() => {
        const handlePopulate = (e: CustomEvent) => {
            setInput(e.detail);
        };
        const handleCommand = (e: CustomEvent) => {
            if (e.detail) sendThreadMessage(e.detail);
        };
        window.addEventListener("populateInput", handlePopulate as EventListener);
        window.addEventListener("cortexCommand", handleCommand as EventListener);
        return () => {
            window.removeEventListener("populateInput", handlePopulate as EventListener);
            window.removeEventListener("cortexCommand", handleCommand as EventListener);
        };
    }, [sendThreadMessage]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const win = window as unknown as WindowWithSpeech;
        const SpeechRecognitionClass =
            win.SpeechRecognition || win.webkitSpeechRecognition;

        if (!SpeechRecognitionClass) {
            setIsSupported(false);
            setVoiceError("Browser not supported");
            return;
        }

        recognitionRef.current = new SpeechRecognitionClass();
        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = "";
            let finalTranscript = "";
            const index = typeof event.resultIndex === "number" ? event.resultIndex : 0;

            for (let i = index; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                setInput(finalTranscript);
                setVoiceError(null);
                shouldBeListeningRef.current = false;
                setIsListening(false);
                recognition.stop();

                setTimeout(async () => {
                    try {
                        await sendThreadMessage(finalTranscript);
                        setInput("");
                    } catch (err) {
                        console.error("Voice send failed:", err);
                    }
                }, 500);
            } else if (interimTranscript) {
                setInput(interimTranscript);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            const errorType = event.error;
            if (errorType === "no-speech") return;

            shouldBeListeningRef.current = false;
            setIsListening(false);

            if (errorType === "not-allowed") {
                setVoiceError("Microphone access denied");
            } else if (errorType === "network") {
                setVoiceError("Network error. Check connection.");
            } else {
                setVoiceError(`Voice Error: ${errorType}`);
            }
        };

        recognition.onend = () => {
            if (shouldBeListeningRef.current) {
                setTimeout(() => {
                    if (shouldBeListeningRef.current && recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                        } catch {
                            shouldBeListeningRef.current = false;
                            setIsListening(false);
                        }
                    }
                }, 300);
            } else {
                setIsListening(false);
            }
        };

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            }
        };
    }, [sendThreadMessage]);

    const toggleVoice = () => {
        if (!isSupported) {
            setVoiceError("Voice not supported in this browser");
            return;
        }

        setVoiceError(null);
        if (isListening) {
            shouldBeListeningRef.current = false;
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            shouldBeListeningRef.current = true;
            setIsListening(true);
            try {
                recognitionRef.current?.start();
            } catch {
                setVoiceError("Could not start microphone");
                shouldBeListeningRef.current = false;
                setIsListening(false);
            }
        }
    };

    const handleSend = async () => {
        const message = input.trim();
        if (!message) return;
        try {
            setGlobalError(null);
            await sendThreadMessage(message);
            setInput("");
        } catch (err: unknown) {
            console.error("Failed to send message:", err);
            const error = err as { message?: string };
            const errorMsg = error.message?.toLowerCase() || "";
            if (
                errorMsg.includes("streaming") ||
                errorMsg.includes("response") ||
                errorMsg.includes("network")
            ) {
                setGlobalError("Network error detected. Please check your connection.");
            } else {
                setVoiceError("Failed to send message. Please try again.");
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950/50 relative overflow-hidden">
            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth"
            >
                {messages.length === 0 && !streaming && (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4 animate-in fade-in zoom-in duration-700">
                        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center p-0.5 shadow-xl rotate-3">
                            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-white">
                                <Sparkles size={24} className="text-indigo-400" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-white tracking-tight">Cortex Interface</h2>
                            <p className="text-zinc-500 text-xs max-w-[200px] mx-auto leading-relaxed">
                                Commands for database, visualizations, and team management.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((message: TamboMessage, idx: number) => (
                    <div
                        key={message.id || `msg-${idx}`}
                        className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${message.role === "user" ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-indigo-600 border-indigo-500 text-white"
                            }`}>
                            {message.role === "user" ? <UserIcon size={12} /> : <Bot size={12} />}
                        </div>
                        <div className={`max-w-[95%] space-y-1 ${message.role === "user" ? "ml-auto text-right" : "text-left"}`}>
                            <div className={`block w-full px-4 py-2.5 rounded-xl text-xs leading-relaxed font-sans shadow-2xl ${message.role === "user" ? "text-white bg-white/5 rounded-tr-none border border-white/10" : "text-white bg-zinc-950/80 backdrop-blur-md border border-white/10"
                                }`}>
                                {(message.content as TamboContentPart[]).map((part, i) => {
                                    if (part.type === "text") {
                                        const text = part.text || "";

                                        // Check for requestedSchema (DB connection form, auth forms, etc.)
                                        if (text.includes("requestedSchema") && text.includes("{")) {
                                            try {
                                                const jsonMatch = text.match(/\{[\s\S]*\}/);
                                                if (jsonMatch) {
                                                    const data = JSON.parse(jsonMatch[0]);
                                                    if (data.requestedSchema) {
                                                        console.log("✅ [CortexChat] Detected requestedSchema, rendering ElicitationUI");

                                                        // Handle elicitation response
                                                        const handleElicitationResponse = async (response: any) => {
                                                            if (response.action === "accept" && response.content) {
                                                                const keys = Object.keys(response.content);
                                                                if (keys.length === 1) {
                                                                    await sendThreadMessage(String(response.content[keys[0]]));
                                                                } else if (keys.length > 1) {
                                                                    await sendThreadMessage(JSON.stringify(response.content));
                                                                }
                                                            }
                                                        };

                                                        return (
                                                            <div key={i} className="mt-3 pt-3 border-t border-white/10 w-full">
                                                                <ElicitationUI
                                                                    request={{
                                                                        message: data.message || "Please fill out the form",
                                                                        requestedSchema: data.requestedSchema
                                                                    } as any}
                                                                    onResponse={handleElicitationResponse}
                                                                />
                                                            </div>
                                                        );
                                                    }
                                                }
                                            } catch (err) {
                                                console.error("Failed to parse requestedSchema:", err);
                                            }
                                        }

                                        // Heuristic JSON check (kept for legacy support if needed)
                                        if (text.includes("{") && (text.includes('"status"') || text.includes('"cpu"'))) {
                                            try {
                                                const jsonMatch = text.match(/\{[\s\S]*\}/);
                                                if (jsonMatch) {
                                                    const data = JSON.parse(jsonMatch[0]);
                                                    return <div key={i} className="mt-2 pt-2 border-t border-white/5"><AdminStats data={data.data || data} status={data.status} message={data.message} /></div>;
                                                }
                                            } catch { }
                                        }
                                        return <p key={i} className="whitespace-pre-wrap">{part.text}</p>;
                                    }

                                    if (part.type === "tool-result" || part.type === "tool_result" || part.type === "component" || part.type === "elicitation") {
                                        const isElicitation = part.type === "elicitation" || part.name === "elicitation";
                                        const name = isElicitation ? "elicitation" : (part.toolName || part.name);
                                        const props: any = isElicitation ? part : (part.result || part.content || part.props);

                                        // Special case for Access Denied
                                        if (props?.status === "denied") {
                                            return (
                                                <div key={i} className="mt-3 w-full flex justify-center">
                                                    <AccessDenied message={props.message} />
                                                </div>
                                            );
                                        }

                                        const componentConfig = tamboComponents.find(c => c.name === name);

                                        if (componentConfig && props) {
                                            const Component = componentConfig.component;

                                            // Handle elicitation response
                                            const handleElicitationResponse = async (response: any) => {
                                                if (response.action === "accept" && response.content) {
                                                    const keys = Object.keys(response.content);
                                                    if (keys.length === 1) {
                                                        await sendThreadMessage(String(response.content[keys[0]]));
                                                    } else if (keys.length > 1) {
                                                        // For multi-field forms, send the whole JSON string
                                                        await sendThreadMessage(JSON.stringify(response.content));
                                                    }
                                                }
                                            };

                                            return (
                                                <div key={i} className="mt-3 pt-3 border-t border-white/10 w-full flex justify-center overflow-hidden">
                                                    <Component
                                                        {...(props as any)}
                                                        request={props}
                                                        onResponse={handleElicitationResponse}
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
                                    return null;
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                {streaming && (
                    <div className="flex gap-3 animate-pulse">
                        <div className="w-7 h-7 rounded-md bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                            <Loader2 size={12} className="text-indigo-400 animate-spin" />
                        </div>
                        <div className="bg-zinc-900 w-12 h-7 rounded-full border border-white/5" />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-zinc-950/80 backdrop-blur-xl border-t border-white/10">
                {globalError && <ErrorPopup message={globalError} onClose={() => setGlobalError(null)} />}
                {voiceError && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-3 py-1.5 bg-red-900/80 border border-red-500/30 text-red-200 text-[10px] rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <AlertCircle size={10} />
                        {voiceError}
                    </div>
                )}

                <div className="flex gap-2 items-center bg-white/5 border border-white/10 p-1.5 rounded-full focus-within:border-indigo-500/50 transition-all">
                    <button
                        onClick={toggleVoice}
                        disabled={!isSupported}
                        className={`p-2 rounded-full transition-all ${isSupported ? (isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "text-zinc-500 hover:text-white") : "opacity-20 cursor-not-allowed"
                            }`}
                    >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void handleSend()}
                        placeholder={isListening ? "Listening..." : "Command cortex..."}
                        className="flex-1 bg-transparent text-white px-2 py-1 focus:outline-none placeholder:text-zinc-600 text-xs"
                    />

                    <button
                        onClick={() => void handleSend()}
                        disabled={!input.trim() || streaming}
                        className="bg-white text-black p-2 rounded-full hover:opacity-90 active:scale-95 disabled:opacity-20 transition-all"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
