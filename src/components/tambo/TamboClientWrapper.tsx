"use client";

import { TamboProvider, type TamboComponent } from "@tambo-ai/react";
import { createTools, tamboComponents } from "@/tambo/tools";

import { useMemo } from "react";

interface TamboClientWrapperProps {
  children: React.ReactNode;
  apiKey: string;
  userToken: string;
  role: "admin" | "user";
}

export function TamboClientWrapper({
  children,
  apiKey,
  userToken,
  role,
}: TamboClientWrapperProps) {
  console.log("🎯 [TamboClientWrapper] Initializing Tambo with:", {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    userToken,
    role,
  });

  // Generate tools with baked-in role security
  // PRO TIP: Memoize this to prevent TamboProvider from reloading/re-authing on every render
  const activeTools = useMemo(() => {
    console.log("🛠️ [TamboClientWrapper] Creating tools for role:", role);
    const tools = createTools(role);
    console.log("✅ [TamboClientWrapper] Tools created:", tools.length, "tools");
    return tools;
  }, [role]);

  console.log("🚀 [TamboClientWrapper] Rendering TamboProvider...");

  return (
    <TamboProvider
      apiKey={apiKey}
      tools={activeTools}
      components={tamboComponents as TamboComponent[]}
      userToken={userToken}
    >
      {children}
    </TamboProvider>
  );
}
