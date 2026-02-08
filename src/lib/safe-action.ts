import { auth } from "@/server/auth/auth";
import { headers } from "next/headers";
import { z } from "zod";

export type ActionResponse<T> =
    | { success: true; data: T }
    | { success: false; error: string; code?: string };

// Define a type-safe session structure based on the auth config
export type AuthSession = Awaited<ReturnType<typeof getSession>>;

export async function getSession() {
    return await auth.api.getSession({
        headers: await headers(),
    });
}

export async function protectAction(role?: string) {
    const session = await getSession();

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Role check with type assertion to the expected User shape
    const userRole = (session.user as { role?: string }).role;
    if (role && userRole !== role) {
        throw new Error("Forbidden");
    }

    return session;
}

export async function createSafeAction<TInput, TOutput>(
    schema: z.ZodSchema<TInput>,
    handler: (data: TInput, session: NonNullable<AuthSession>) => Promise<TOutput>,
    options?: { role?: string }
): Promise<(input: TInput) => Promise<ActionResponse<TOutput>>> {
    return async (input: TInput) => {
        try {
            const validatedInput = schema.parse(input);
            const session = await protectAction(options?.role);

            // session is guaranteed non-nullable by protectAction if it doesn't throw
            const result = await handler(validatedInput, session as NonNullable<AuthSession>);
            return { success: true, data: result };
        } catch (error: unknown) {
            console.error("Action error:", error);

            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

            if (error instanceof z.ZodError) {
                return {
                    success: false,
                    error: "Invalid input",
                    code: "VALIDATION_ERROR"
                };
            }

            if (errorMessage === "Unauthorized") {
                return { success: false, error: "Authentication required", code: "UNAUTHORIZED" };
            }

            if (errorMessage === "Forbidden") {
                return { success: false, error: "Permission denied", code: "FORBIDDEN" };
            }

            return {
                success: false,
                error: errorMessage,
                code: "INTERNAL_ERROR"
            };
        }
    };
}
