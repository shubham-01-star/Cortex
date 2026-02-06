import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Cortex</h1>
          <p className="text-zinc-400">Direct Login (Bypass Onboarding)</p>
        </div>

        <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                placeholder="admin@cortex.dev"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            onClick={() => {
              // This will be handled by client-side auth
              window.location.href = '/dashboard';
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Login to Dashboard
          </button>

          <div className="text-center text-sm text-zinc-500">
            <p>Test Credentials:</p>
            <p className="font-mono text-xs mt-1">admin@cortex.dev</p>
          </div>
        </div>

        <div className="text-center">
          <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
            ← Back to Landing
          </a>
        </div>
      </div>
    </div>
  );
}
