"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ShieldAlert,
    Sparkles,
    MoveRight,
    Network,
    Quote,
    Terminal
} from "lucide-react";
import { OnboardingModal } from "@/components/onboarding/ChatModal";
import { TamboClientWrapper } from "@/components/tambo/TamboClientWrapper";
import { useSession } from "@/server/auth/auth-client"; 

export function LandingPageClient({
    apiKey = "",
    overlay
}: {
    apiKey?: string;
    overlay?: React.ReactNode
} = {}) {
    const { data: session } = useSession();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <TamboClientWrapper
            apiKey={apiKey}
            role={(session?.user?.role as "user" | "admin") || "user"}
        >
            <div className="flex min-h-screen flex-col bg-black text-white selection:bg-indigo-500/30 relative overflow-hidden font-sans">
                
                {/* --- BACKGROUND EFFECTS --- */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none opacity-40" />

                {/* --- OVERLAY (For Loading/Auth) --- */}
                {overlay && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                        {overlay}
                    </div>
                )}

                {/* --- HERO SECTION --- */}
                <section className={`flex flex-1 flex-col items-center justify-center space-y-10 px-6 pt-32 pb-16 text-center relative z-10 ${overlay ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
                    
                    {/* HACKATHON BADGE */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-medium uppercase tracking-widest shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)] animate-in fade-in slide-in-from-top-4 duration-700">
                        <Terminal className="w-3 h-3" />
                        Built for Tambo Hackathon: The UI Strikes Back
                    </div>

                    {/* MAIN HEADLINES */}
                    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-100">
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-gradient-to-b from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent drop-shadow-2xl">
                            CORTEX
                        </h1>
                        <p className="mx-auto max-w-[650px] text-lg md:text-xl text-zinc-400 font-light leading-relaxed">
                            <span className="text-white font-medium">Stop writing SQL. Start commanding.</span><br/>
                            An identity-aware, visual database interface powered by <span className="text-indigo-400 font-medium">Generative UI</span>.
                        </p>
                    </div>

                    {/* VISION BLOCK (Michael Magan Key Takeaway) */}
                    <div className="relative max-w-2xl mx-auto mt-8 animate-in fade-in zoom-in-95 duration-1000 delay-300">
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-sm opacity-50" />
                        <div className="relative bg-zinc-900/80 border border-white/10 backdrop-blur-xl p-6 rounded-xl text-left flex gap-4">
                            <Quote className="w-8 h-8 text-zinc-600 flex-shrink-0" />
                            <div className="space-y-2">
                                <p className="text-zinc-300 text-sm italic font-medium leading-relaxed">
                                    "The future includes <span className="text-white">Visual UIs</span> in addition to natural language. Users asking for what they need, and the app surfacing it to them."
                                </p>
                                <div className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
                                    — Aligned with Tambo Vision
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500">
                        <Button
                            size="lg"
                            onClick={() => setIsModalOpen(true)}
                            className="h-14 px-8 text-base font-bold rounded-full bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] active:scale-95 group"
                        >
                            Initialize Cortex
                            <MoveRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </section>

                {/* --- FEATURE GRID --- */}
                <section className={`container mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-32 md:grid-cols-3 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 ${overlay ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
                    
                    <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm hover:bg-zinc-900/60 hover:border-indigo-500/30 transition-all duration-300 group">
                        <CardHeader>
                            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                                <Network className="h-5 w-5 text-indigo-400" />
                            </div>
                            <CardTitle className="text-white text-lg">Visual Schema</CardTitle>
                        </CardHeader>
                        <CardContent className="text-zinc-400 text-sm">
                            Cortex scans your database and generates interactive <strong>ReactFlow Canvases</strong>. See relationships instantly.
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm hover:bg-zinc-900/60 hover:border-cyan-500/30 transition-all duration-300 group">
                        <CardHeader>
                            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                                <Sparkles className="h-5 w-5 text-cyan-400" />
                            </div>
                            <CardTitle className="text-white text-lg">Generative UI</CardTitle>
                        </CardHeader>
                        <CardContent className="text-zinc-400 text-sm">
                            Your intent drives the interface. Ask for revenue, get a Chart. Ask for users, get a Table. <strong>Zero static dashboards.</strong>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm hover:bg-zinc-900/60 hover:border-red-500/30 transition-all duration-300 group">
                        <CardHeader>
                            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
                                <ShieldAlert className="h-5 w-5 text-red-400" />
                            </div>
                            <CardTitle className="text-white text-lg">Ghost Mode</CardTitle>
                        </CardHeader>
                        <CardContent className="text-zinc-400 text-sm">
                            High-risk actions trigger <strong>Ghost Mode</strong>. The canvas turns red, nodes shake, and RBAC policies are enforced.
                        </CardContent>
                    </Card>

                </section>

                {/* --- FOOTER --- */}
                <div className="fixed bottom-0 left-0 right-0 py-4 bg-gradient-to-t from-black to-transparent text-center z-20 pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                            Powered by
                        </span>
                        <span className="text-xs font-bold text-white tracking-wider">
                            TAMBO SDK
                        </span>
                    </div>
                </div>

                <OnboardingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </div>
        </TamboClientWrapper>
    );
}