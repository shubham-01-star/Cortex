import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/tambo/Navbar";
import { TamboClientWrapper } from "@/components/tambo/TamboClientWrapper";
import { CortexChat } from "@/components/chat/CortexChat";
import { SuggestionsPanel } from "@/components/tambo/SuggestionsPanel";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <TamboClientWrapper
      apiKey={process.env.TAMBO_API_KEY!}
      userToken={session.session.id}
      role={(session.user.role as "admin" | "user") || "user"}
    >
      <div className="h-screen bg-black text-zinc-100 flex flex-col font-[family-name:var(--font-geist-sans)] overflow-hidden dark">
        <Navbar
          role={(session.user.role as "admin" | "user") || "user"}
          userName={session.user.name || "User"}
        />
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Chat (35%) */}
          <aside className="w-[35%] min-w-[320px] max-w-[450px] border-r border-white/10 flex flex-col relative z-20">
            <CortexChat />
          </aside>

          {/* Right Panel: Canvas/Children (65%) */}
          <main className="flex-1 overflow-hidden relative z-10 bg-zinc-950 flex">
            <div className="flex-1 h-full overflow-hidden">
              {children}
            </div>
            <SuggestionsPanel role={(session.user.role as "admin" | "user") || "user"} />
          </main>
        </div>
      </div>
    </TamboClientWrapper>
  );
}
