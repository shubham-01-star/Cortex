"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, MessageSquare, ShieldCheck, Sparkles, MoveRight } from "lucide-react";
import { OnboardingModal } from "@/components/onboarding/ChatModal";
import { TamboClientWrapper } from "@/components/tambo/TamboClientWrapper";
import { useSession } from "@/lib/auth-client";

export function LandingPageClient({ apiKey }: { apiKey: string }) {
    const { data: session } = useSession();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const guestToken = useMemo(() => `guest-${Math.random().toString(36).substring(7)}`, []);

    return (
        <TamboClientWrapper
            apiKey={apiKey}
            userToken={session?.session?.id || guestToken}
            role={(session?.user?.role as any) || "user"}
        >
            <div className="flex min-h-screen flex-col bg-zinc-950 text-foreground selection:bg-indigo-500/30">
                {/* Background Gradients */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#4f46e520_0%,transparent_50%)]" />
                <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />

                {/* Hero Section */}
                <section className="flex flex-1 flex-col items-center justify-center space-y-12 px-6 py-24 text-center relative z-10">
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                            <Sparkles size={12} />
                            The Visual Data Commander
                        </div>
                        <h1 className="text-7xl font-black tracking-tighter sm:text-8xl bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                            CORTEX
                        </h1>
                        <p className="mx-auto max-w-[600px] text-xl text-zinc-400 font-light leading-relaxed">
                            An AI-orchestrated, identity-aware database interface that replaces raw queries with <span className="text-white font-medium">Generative UI</span>.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-5 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
                        <Button
                            size="lg"
                            onClick={() => setIsModalOpen(true)}
                            className="h-14 px-10 text-lg rounded-full bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 group"
                        >
                            Initialize Cortex
                            <MoveRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button variant="outline" size="lg" className="h-14 px-10 text-lg rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all">
                            Documentation
                        </Button>
                    </div>
                </section>

                {/* Feature Grid */}
                <section className="container mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 md:grid-cols-3 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                    <Card className="bg-white/5 border-white/10 shadow-2xl backdrop-blur-sm group hover:border-blue-500/50 transition-colors">
                        <CardHeader>
                            <Database className="h-10 w-10 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                            <CardTitle className="text-white">Invisible Database</CardTitle>
                        </CardHeader>
                        <CardContent className="text-zinc-400 text-sm leading-relaxed">
                            Interact with your database without writing a single line of SQL.
                            Cortex understands your schema automatically.
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 shadow-2xl backdrop-blur-sm group hover:border-cyan-500/50 transition-colors">
                        <CardHeader>
                            <MessageSquare className="h-10 w-10 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
                            <CardTitle className="text-white">Generative UI</CardTitle>
                        </CardHeader>
                        <CardContent className="text-zinc-400 text-sm leading-relaxed">
                            Your intent becomes interfaces. Ask for data and get interactive tables,
                            charts, and forms dynamically rendered by Tambo.
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 shadow-2xl backdrop-blur-sm group hover:border-emerald-500/50 transition-colors">
                        <CardHeader>
                            <ShieldCheck className="h-10 w-10 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                            <CardTitle className="text-white">Identity-Aware Safety</CardTitle>
                        </CardHeader>
                        <CardContent className="text-zinc-400 text-sm leading-relaxed">
                            Enterprise-grade safety. High-risk actions trigger Ghost Mode,
                            requiring explicit confirmation while enforcing RBAC.
                        </CardContent>
                    </Card>
                </section>

                <OnboardingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </div>
        </TamboClientWrapper>
    );
}
