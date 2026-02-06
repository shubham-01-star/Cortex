import { useState } from "react";
import { createInvitation, type InviteUserInput } from "@/actions/invite";
import { Loader2, UserPlus, Mail } from "lucide-react";

export function InviteForm(props: Partial<InviteUserInput>) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form from props if Tambo provided them (e.g. "Invite Rahul")
  const [formData, setFormData] = useState<InviteUserInput>({
    name: props.name || "",
    email: props.email || "",
    role: (props.role as "ADMIN" | "DEVELOPER" | "VIEWER") || "VIEWER",
    position: props.position || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createInvitation(formData);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message);
      }
    } catch (_err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev: InviteUserInput) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-xl animate-in fade-in zoom-in">
        <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
          <Mail className="text-white w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Invitation Sent!</h3>
        <p className="text-zinc-400 text-sm mt-2 text-center">
          <span className="text-white font-medium">{formData.name}</span> has been invited as a <span className="text-indigo-300">{formData.role}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
      <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
        <UserPlus className="text-indigo-400 w-5 h-5" />
        <h3 className="font-semibold text-white">Invite Team Member</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-zinc-600"
            placeholder="e.g. Rahul Sharma"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-zinc-600"
            placeholder="rahul@company.com"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            >
              <option value="VIEWER">Viewer</option>
              <option value="DEVELOPER">Developer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase">Position</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-zinc-600"
              placeholder="e.g. Frontend Lead"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending Invite...
              </>
            ) : (
              "Send Invitation"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
