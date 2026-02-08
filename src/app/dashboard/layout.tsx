import { auth } from "@/server/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/tambo/Navbar";
import { TamboClientWrapper } from "@/components/tambo/TamboClientWrapper";
import { CortexChat } from "@/components/chat/CortexChat";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ResizableLayout } from "@/components/cortex/ResizableLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

  let session;

  if (useMock) {
    // Mock Session
    session = {
      user: {
        id: "usr_mock_admin",
        name: "Mock Admin",
        email: "admin@cortex.dev",
        role: "admin",
        image: null
      },
      session: {
        id: "sess_mock",
        expiresAt: new Date(Date.now() + 86400000),
        token: "mock_token",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: "127.0.0.1",
        userAgent: "MockAgent",
        userId: "usr_mock_admin"
      }
    };
  } else {
    session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      redirect("/login");
    }
  }

  return (
    <TamboClientWrapper
      apiKey={process.env.TAMBO_API_KEY!}
      role={(session.user.role as "admin" | "user") || "user"}
    >
      <div className="h-screen bg-black text-zinc-100 flex flex-col font-[family-name:var(--font-geist-sans)] overflow-hidden dark">
        <Navbar
          role={(session.user.role as "admin" | "user") || "user"}
          userName={session.user.name || "User"}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ResizableLayout
            leftPanel={
              <ErrorBoundary name="CortexChat">
                <CortexChat />
              </ErrorBoundary>
            }
            rightPanel={
              <div className="flex-1 h-full overflow-hidden">
                <ErrorBoundary name="MainContent">
                  {children}
                </ErrorBoundary>
              </div>
            }
          />
        </div>
      </div>
    </TamboClientWrapper>
  );
}
