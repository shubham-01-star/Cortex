"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useTambo } from "@tambo-ai/react";
import { CanvasPanel } from "@/components/chat/CanvasPanel";
import { Loader2 } from "lucide-react";

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

        if (!hasConnection) {
          // Trigger Genesis Flow
          setTimeout(() => {
            sendThreadMessage(
              "No database detected. Let's connect one. HIDDEN_SYS_Execute setup_database tool to show connection form."
            );
          }, 500);
        } else {
          // DB already connected - show ready message
          setTimeout(() => {
            sendThreadMessage("System ready. What would you like to explore?");
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
  return <CanvasPanel />;
}
