"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/server/auth/auth-client";
import { useTambo } from "@tambo-ai/react";
import { CanvasPanel } from "@/components/chat/CanvasPanel";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const { sendThreadMessage } = useTambo();
  const hasInitialized = useRef(false);
  const [isCheckingDB, setIsCheckingDB] = useState(true);

  // Genesis Flow: Check if DB is connected
  useEffect(() => {
    if (!session?.user || hasInitialized.current) return;

    const checkDBConnection = async () => {
      try {
        // Check if user has a DB connection configured
        const response = await fetch('/api/db/check-connection');
        const { hasConnection } = await response.json();
        const role = (session?.user as { role?: string })?.role;

        if (!hasConnection && role === "admin") {
          // Trigger Genesis Flow for ADMINs only
          // Trigger Genesis Flow for ADMINs only
          setTimeout(() => {
            if (sendThreadMessage) {
              sendThreadMessage(
                "No database connection detected. We need to set up the database. Please help me connect using the setup_database tool."
              );
            }
          }, 500);
        } else {
          // DB already connected - show ready message
          setTimeout(() => {
            if (sendThreadMessage) {
              sendThreadMessage("System ready. What would you like to explore?");
            }
          }, 500);
        }
      } catch (error) {
        console.error('Failed to check DB connection:', error);
      } finally {
        setIsCheckingDB(false);
        hasInitialized.current = true;
      }
    };

    checkDBConnection();
  }, [session, sendThreadMessage]);

  if (isPending || isCheckingDB) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Initializing Cortex...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400">Please log in to access Cortex.</p>
        </div>
      </div>
    );
  }

  // Layout already provides split-screen, just render canvas
  return (
    <ErrorBoundary name="Canvas">
      <CanvasPanel />
    </ErrorBoundary>
  );
}
