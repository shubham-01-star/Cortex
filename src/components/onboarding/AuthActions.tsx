"use client";

import { LogIn, UserPlus, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/server/auth/auth-client";
import { useTambo } from "@tambo-ai/react";

export function AuthActions({ action }: { action?: string }) {
    const { sendThreadMessage } = useTambo();

    const handleGoogleLogin = async () => {
        await signIn.social({
            provider: "google",
            callbackURL: "/dashboard",
        });
    };

    const handleChoice = async (message: string) => {
        console.log("🎯 [AuthActions] Button clicked, sending message:", message);
        try {
            await sendThreadMessage(message);
            console.log("✅ [AuthActions] Message sent successfully");
        } catch (error) {
            console.error("❌ [AuthActions] Failed to send message:", error);
        }
    };

    if (action === "REDIRECT_LOGIN") {
        return (
            <div className="flex flex-col items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 w-full animate-in zoom-in duration-300">
                <p className="text-zinc-400 text-xs text-center">Please log in to continue.</p>
                <Button
                    onClick={() => handleChoice("I want to login with email")}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                    <LogIn className="mr-2" size={16} />
                    Login
                </Button>
            </div>
        );
    }

    if (action === "REDIRECT_SIGNUP") {
        return (
            <div className="flex flex-col items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 w-full animate-in zoom-in duration-300">
                <p className="text-zinc-400 text-xs text-center">Create a new account.</p>
                <Button
                    onClick={() => handleChoice("I want to create a new account")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                    <UserPlus className="mr-2" size={16} />
                    Create Account
                </Button>
            </div>
        );
    }

    // Default: Choice Menu
    return (
        <div className="flex flex-col w-full bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500">
            {/* Header/Message Section */}
            <div className="px-4 py-3 bg-white/[0.02]">
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold text-center">
                    Authentication
                </p>
            </div>

            <hr className="border-white/5" />

            {/* Buttons Grid */}
            <div className="p-4 flex flex-col gap-3">
                <div className="flex gap-2">
                    <Button
                        onClick={handleGoogleLogin}
                        variant="outline"
                        className="flex-1 border-white/5 bg-zinc-800/50 text-white hover:bg-zinc-800 rounded-xl py-6 font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </Button>
                    <Button
                        onClick={() => signIn.social({ provider: "github", callbackURL: "/dashboard" })}
                        variant="outline"
                        className="flex-1 border-white/5 bg-zinc-800/50 text-white hover:bg-zinc-700 rounded-xl py-6 font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <Github className="w-4 h-4" />
                        GitHub
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={() => handleChoice("I want to login")}
                        variant="outline"
                        className="flex-1 border-white/5 bg-white/5 text-zinc-300 hover:bg-white/10 rounded-xl py-6 font-bold transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <LogIn className="mr-2" size={16} />
                        Login
                    </Button>
                    <Button
                        onClick={() => handleChoice("I want to sign up")}
                        variant="outline"
                        className="flex-1 border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 rounded-xl py-6 font-bold transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <UserPlus className="mr-2" size={16} />
                        Sign Up
                    </Button>
                </div>
            </div>
        </div>
    );
}
