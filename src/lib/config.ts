import { z } from "zod";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";
console.log("🔧 [Config] Loading Config...", {
    isMock,
    useMockVar: process.env.NEXT_PUBLIC_USE_MOCK
});

// If in Mock Mode, we make everything optional or provide defaults
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: isMock ? z.string().optional() : z.string().url("Invalid DATABASE_URL"),
    BETTER_AUTH_URL: isMock ? z.string().optional() : z.string().url("Invalid BETTER_AUTH_URL"),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters").optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    PORT: z.string().default("3099"),
    TRUSTED_ORIGINS: z.string().default("http://localhost:3099,http://127.0.0.1:3099"),
    RESEND_API_KEY: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3099"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    if (isMock) {
        console.warn("⚠️ [Mock Mode] Environment validation failed, but proceeding via loose mode:", _env.error.format());
    } else {
        console.error("❌ Invalid environment variables:", _env.error.format());
        throw new Error("Invalid environment variables. Please check your .env file.");
    }
}

// Fallback for Mock Mode if validation failed
const envData = _env.success ? _env.data : {
    NODE_ENV: "development",
    DATABASE_URL: "postgres://mock:mock@localhost:5432/mock",
    BETTER_AUTH_URL: "http://localhost:3099",
    BETTER_AUTH_SECRET: "mock_secret_mock_secret_mock_secret_32",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GITHUB_CLIENT_ID: "",
    GITHUB_CLIENT_SECRET: "",
    PORT: "3099",
    TRUSTED_ORIGINS: "http://localhost:3099",
    RESEND_API_KEY: "",
    NEXT_PUBLIC_APP_URL: "http://localhost:3099",
} as z.infer<typeof envSchema>;

export const env = envData;

export const config = {
    isProd: env.NODE_ENV === "production",
    isDev: env.NODE_ENV === "development",
    appUrl: env.NEXT_PUBLIC_APP_URL || "http://localhost:3099",
    betterAuth: {
        url: env.BETTER_AUTH_URL || "http://localhost:3099",
        secret: env.BETTER_AUTH_SECRET,
        trustedOrigins: (env.TRUSTED_ORIGINS || "").split(","),
    },
    db: {
        url: env.DATABASE_URL || "postgres://mock:mock@localhost:5432/mock",
    },
    email: {
        resendApiKey: env.RESEND_API_KEY,
    }
} as const;
