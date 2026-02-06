"use client";

import { useState } from "react";
import { saveConnection, type ConnectionInput } from "@/actions/connection-tools";
import { Loader2, Database, CheckCircle, AlertCircle } from "lucide-react";

export function DbConnectForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ConnectionInput>({
    provider: "postgresql",
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "",
    database: "cortex_db",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await saveConnection(formData);
      if (result.success) {
        setSuccess(true);
        // Optional: Trigger a refresh or notify parent
        window.location.reload();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: ConnectionInput) => ({
      ...prev,
      [name]: name === "port" ? parseInt(value) || 0 : value,
    }));
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-green-500/10 border border-green-500/20 rounded-xl animate-in fade-in zoom-in">
        <CheckCircle className="text-green-400 w-12 h-12 mb-4" />
        <h3 className="text-xl font-bold text-white">Database Connected</h3>
        <p className="text-zinc-400 text-sm mt-2">Cortex is ready to visualize your schema.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
        <Database className="text-indigo-400 w-5 h-5" />
        <h3 className="font-semibold text-white">Connect Database</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase">Provider</label>
          <select
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sqlite">SQLite</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase">Host</label>
            <input
              type="text"
              name="host"
              value={formData.host}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              placeholder="localhost"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase">Port</label>
            <input
              type="text"
              name="port"
              value={formData.port}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase">User</label>
            <input
              type="text"
              name="user"
              value={formData.user}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              placeholder="postgres"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              placeholder="••••••"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase">Database Name</label>
          <input
            type="text"
            name="database"
            value={formData.database}
            onChange={handleChange}
            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            placeholder="cortex_db"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Database"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
