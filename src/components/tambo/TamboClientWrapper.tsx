"use client";

import { TamboProvider, type TamboComponent, MCPTransport } from "@tambo-ai/react";
import { createTools, tamboComponents } from "@/tambo/tools";

import { useMemo } from "react";

import { MockTamboProvider } from "@/components/tambo/MockTamboProvider";

interface TamboClientWrapperProps {
  children: React.ReactNode;
  apiKey: string;
  role: "admin" | "user";
}

export function TamboClientWrapper({
  children,
  apiKey,
  role,
}: TamboClientWrapperProps) {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

  console.log("🎯 [TamboClientWrapper] Initializing Tambo with:", {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    role,
    useMock
  });

  // Generate tools with baked-in role security
  // PRO TIP: Memoize this to prevent TamboProvider from reloading/re-authing on every render
  const activeTools = useMemo(() => {
    console.log("🛠️ [TamboClientWrapper] Creating tools for role:", role);
    const tools = createTools(role);
    console.log("✅ [TamboClientWrapper] Tools created:", tools.length, "tools");
    return tools;
  }, [role]);

  if (useMock) {
    return (
      <MockTamboProvider>
        {children}
      </MockTamboProvider>
    );
  }

  console.log("🚀 [TamboClientWrapper] Rendering Real TamboProvider...");

  const mcpServers = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_MCP_SERVER_URL;
    if (!url) return [];

    return [
      {
        url,
        serverKey: "cortex-mcp",
        transport: MCPTransport.HTTP,
      }
    ];
  }, []);

  return (
    <TamboProvider
      apiKey={apiKey}
      tools={activeTools}
      components={tamboComponents as TamboComponent[]}
      mcpServers={mcpServers}
    >
      {children}
    </TamboProvider>
  );
}
