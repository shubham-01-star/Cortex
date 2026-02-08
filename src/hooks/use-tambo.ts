"use client";

import { useTambo as useRealTambo, useTamboThread as useRealTamboThread } from "@tambo-ai/react";
import { useMockTambo } from "@/components/tambo/MockTamboProvider";

// Check environment variable (client-side)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useTambo() {
    if (USE_MOCK) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useMockTambo();
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRealTambo();
}

export function useTamboThread() {
    if (USE_MOCK) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useMockTambo(); // Our mock provider returns the same interface for both hook usages roughly
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRealTamboThread();
}
