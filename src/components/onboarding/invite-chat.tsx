"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";
import { useRouter } from "next/navigation";

interface InviteChatProps {
    email: string;
    name: string | null;
    role: string;
    token: string;
}

type Message = {
    id: string;
    type: "system" | "user";
    content: React.ReactNode;
    delay?: number;
};

export function InviteChat({ email, name, role, token }: InviteChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [step, setStep] = useState<"connecting" | "intro" | "form" | "submitting" | "success">("connecting");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);

    const addMessage = (msg: Message) => {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    useEffect(() => {
        // Initial Sequence
        const sequence = async () => {
            await new Promise(r => setTimeout(r, 500));
            addMessage({ id: "1", type: "system", content: "Establishing secure connection..." });

            await new Promise(r => setTimeout(r, 1000));
            addMessage({ id: "2", type: "system", content: "Connection confirmed. Handshake verified." });

            await new Promise(r => setTimeout(r, 800));
            addMessage({ id: "3", type: "system", content: <span className="text-emerald-400">Identity Verified: {email}</span> });

            await new Promise(r => setTimeout(r, 800));
            addMessage({
                id: "4",
                type: "system",
                content: (
                    <div className="space-y-2">
                        <p>Welcome, {name || "Agent"}. You have been invited to join the Cortex network with <span className="text-indigo-400 font-mono">{role}</span> clearance.</p>
                        <p>Please initialize your access credentials to proceed.</p>
                    </div>
                )
            });
            setStep("form");
        };

        sequence();
    }, [email, name, role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setStep("submitting");

        // Add user interaction to chat
        addMessage({
            id: "user-submit",
            type: "user",
            content: "Credentials submitted. Requesting access..."
        });

        try {
            await authClient.signUp.email({
                email,
                password,
                name: name || email.split("@")[0],
                // We assume the backend hook in auth.ts handles the invitation linking and role assignment based on email match
            }, {
                onSuccess: () => {
                    setStep("success");
                    addMessage({
                        id: "success-1",
                        type: "system",
                        content: <span className="text-emerald-400 font-bold">Access Granted. Encryption keys generated.</span>
                    });
                    setTimeout(() => {
                        addMessage({
                            id: "success-2",
                            type: "system",
                            content: "Redirecting to Dashboard..."
                        });
                        setTimeout(() => router.push("/dashboard"), 1500);
                    }, 800);
                },
                onError: (ctx: any) => {
                    setStep("form");
                    setError(ctx.error.message);
                    addMessage({
                        id: "error",
                        type: "system",
                        content: <span className="text-red-400">Error: {ctx.error.message}. Please try again.</span>
                    });
                }
            });
        } catch (err) {
            setStep("form");
            setError("An unexpected error occurred.");
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto bg-black/50 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl flex flex-col h-[600px]">
            {/* Header */}
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Cortex Link v1.0</span>
                </div>
                <div className="text-xs text-zinc-600 font-mono">
                    {step === "connecting" ? "SYNCING..." : "ONLINE"}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-sm">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`
                            max-w-[85%] p-3 rounded-lg 
                            ${msg.type === "user"
                                ? "bg-indigo-600/20 text-indigo-100 border border-indigo-500/30 rounded-br-none"
                                : "bg-zinc-900/80 text-zinc-300 border border-zinc-700/50 rounded-bl-none"}
                        `}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Form Input Area within chat flow */}
                {step === "form" && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 delay-500">
                        <div className="w-full max-w-[85%] bg-zinc-900/80 p-4 rounded-lg rounded-bl-none border border-zinc-700/50">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-500 uppercase">Identity</label>
                                    <Input value={email} disabled className="bg-black/50 border-zinc-800 text-zinc-400 font-mono h-9" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-500 uppercase">Set Access Code (Password)</label>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="bg-black/50 border-zinc-700 text-white font-mono h-9 focus:ring-1 focus:ring-indigo-500"
                                        autoFocus
                                        minLength={8}
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs uppercase tracking-wider h-10"
                                    disabled={!password || password.length < 8}
                                >
                                    Initialize <ArrowRight className="w-3 h-3 ml-2" />
                                </Button>
                            </form>
                        </div>
                    </div>
                )}

                {step === "submitting" && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-zinc-900/80 p-3 rounded-lg rounded-bl-none border border-zinc-700/50 flex items-center gap-2 text-zinc-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing cryptographic handshake...</span>
                        </div>
                    </div>
                )}

                <div ref={scrollRef} />
            </div>
        </div>
    );
}
