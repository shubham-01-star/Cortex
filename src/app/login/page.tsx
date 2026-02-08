"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/server/auth/auth-client";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Server, UserPlus, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [systemStatus, setSystemStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    // Basic health check simulation
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) setSystemStatus("online");
        else setSystemStatus("offline");
      } catch {
        setSystemStatus("offline");
      }
    };
    checkStatus();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (!isLogin && !name) {
      setError("Please enter your name.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (isLogin) {
        const { error: authError } = await authClient.signIn.email({
          email,
          password,
        });

        if (authError) {
          setError(authError.message || "Invalid credentials");
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        const { error: authError } = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (authError) {
          setError(authError.message || "Signup failed");
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred connection to the auth server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/5 mb-6">
            <div className={`w-2 h-2 rounded-full ${systemStatus === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
              systemStatus === "offline" ? "bg-red-500" : "bg-zinc-600 animate-pulse"
              }`} />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              System {systemStatus}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter">CORTEX</h1>
          <p className="text-zinc-500 font-light translate-y-[-4px]">
            {isLogin ? "Mission Control Authentication" : "New Recruit Registration"}
          </p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {!isLogin && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="John Doe"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || systemStatus === "offline"}
              className="w-full bg-white text-black hover:bg-zinc-200 font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                <>
                  <span>{isLogin ? "Login" : "Sign Up"}</span>
                  <ShieldCheck className="w-4 h-4 text-zinc-400 group-hover:text-black transition-colors" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 flex flex-col items-center gap-4">
            <div className="w-full flex items-center gap-4">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                {isLogin ? "No Identity?" : "Already Authorized?"}
              </span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors flex items-center gap-2"
            >
              {isLogin ? <UserPlus className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
              {isLogin ? "Request Access Clearance" : "Return to Login"}
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-[10px] text-zinc-600 font-mono leading-relaxed">
              AUTHORISED ACCESS ONLY.<br />
              ALL ACTIVITY IS MONITORED AND LOGGED.
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push("/")}
            disabled={isLoading}
            className="text-zinc-500 hover:text-white transition-colors text-xs font-medium inline-flex items-center gap-2"
          >
            <Server className="w-3 h-3" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
