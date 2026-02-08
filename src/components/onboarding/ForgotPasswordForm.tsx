"use client";

import { useState } from "react";
import { Loader2, Mail, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";

interface ForgotPasswordFormProps {
    email?: string;
    onCancel: () => void;
}

export function ForgotPasswordForm({ email: initialEmail, onCancel }: ForgotPasswordFormProps) {
    const [email, setEmail] = useState(initialEmail || "");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Reverting for now as requested - flow not yet implemented
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to send reset email");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="p-6 bg-zinc-900 border border-emerald-500/20 rounded-xl animate-in fade-in zoom-in">
                <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle className="text-emerald-500" size={24} />
                    </div>
                    <div>
                        <h3 className="text-white font-medium">Check your inbox</h3>
                        <p className="text-zinc-400 text-sm mt-1">
                            We've sent a password reset link to <span className="text-white">{email}</span>
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="mt-2 text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-5 bg-zinc-900/50 border border-white/10 rounded-xl space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-1">
                <h3 className="text-white font-medium flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-500" />
                    Trouble logging in?
                </h3>
                <p className="text-xs text-zinc-400">
                    Enter your email to receive a password reset link.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full bg-zinc-950 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                        {error}
                    </p>
                )}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <>Send Link <ArrowRight size={12} /></>}
                    </button>
                </div>
            </form>
        </div>
    );
}
