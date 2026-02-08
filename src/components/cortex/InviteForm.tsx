import { useState } from "react";
import { useTamboComponentState } from "@tambo-ai/react";
import { createInvitation, type InviteUserInput } from "@/server/actions/invite";
import { Loader2, UserPlus, Mail, Database, Edit, Trash2, Play } from "lucide-react";

export function InviteForm(props: Partial<InviteUserInput> = {}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure props are never undefined - convert to empty strings
  const initialName = props.name ?? "";
  const initialEmail = props.email ?? "";
  const initialPosition = props.position ?? "";
  const initialPermissions = props.permissions ?? [];

  // Use Tambo state tracking for form fields so AI can see and modify them
  const [name, setName] = useTamboComponentState("name", initialName);
  const [email, setEmail] = useTamboComponentState("email", initialEmail);
  const [position, setPosition] = useTamboComponentState("position", initialPosition);
  const [permissions, setPermissions] = useTamboComponentState<string[]>("permissions", initialPermissions);
  const role = "DEVELOPER"; // Base role for collaborators (system internally sets to 'user')

  const togglePermission = (permission: string) => {
    const currentPermissions = permissions || [];
    if (currentPermissions.includes(permission)) {
      setPermissions(currentPermissions.filter((p: string) => p !== permission));
    } else {
      setPermissions([...currentPermissions, permission]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createInvitation({
        name: name || "",
        email: email || "",
        role,
        position: position || "",
        permissions
      });
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


  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-xl animate-in fade-in zoom-in">
        <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
          <Mail className="text-white w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Invitation Sent!</h3>
        <p className="text-zinc-400 text-sm mt-2 text-center">
          <span className="text-white font-medium">{name}</span> has been invited as a <span className="text-indigo-300">{role}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-md bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500">
      {/* Header/Message Section */}
      <div className="px-4 py-3 bg-white/[0.02]">
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold text-center">
          Collaborator Access Request
        </p>
      </div>

      <hr className="border-white/5" />

      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 justify-center">
          <UserPlus className="text-indigo-400 w-4 h-4" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Invite Team Member</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:bg-zinc-950 transition-all outline-none placeholder:text-zinc-700"
                placeholder="Rahul Sharma"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:bg-zinc-950 transition-all outline-none placeholder:text-zinc-700"
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Position</label>
            <input
              type="text"
              name="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:bg-zinc-950 transition-all outline-none placeholder:text-zinc-700"
              placeholder="Software Engineer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Database Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'READ', label: 'Read', icon: Database, desc: 'View data' },
                { id: 'WRITE', label: 'Write', icon: Edit, desc: 'Insert/Update' },
                { id: 'DELETE', label: 'Delete', icon: Trash2, desc: 'Remove data' },
                { id: 'EXECUTE', label: 'Execute', icon: Play, desc: 'Run queries' }
              ].map(perm => (
                <button
                  key={perm.id}
                  type="button"
                  onClick={() => togglePermission(perm.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${(permissions || []).includes(perm.id)
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                    : 'bg-zinc-950/50 border-white/5 text-zinc-400 hover:border-white/10'
                    }`}
                >
                  <perm.icon className="w-3.5 h-3.5" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-bold">{perm.label}</span>
                    <span className="text-[9px] opacity-60">{perm.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-900/10 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs uppercase tracking-widest">Processing...</span>
                </>
              ) : (
                <span className="text-xs uppercase tracking-widest">Authorize & Invite</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
