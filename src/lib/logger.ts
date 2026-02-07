import { config } from "./config";

type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
    private format(level: LogLevel, message: string, data?: unknown) {
        const timestamp = new Date().toISOString();
        const payload: Record<string, unknown> = {
            timestamp,
            level,
            message,
            env: config.isProd ? "production" : "development",
        };

        if (data !== undefined) {
            payload.data = data;
        }

        return JSON.stringify(payload);
    }

    info(message: string, data?: unknown) {
        console.log(this.format("info", message, data));
    }

    warn(message: string, data?: unknown) {
        console.warn(this.format("warn", message, data));
    }

    error(message: string, error?: unknown) {
        const errorData = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: config.isProd ? undefined : error.stack,
        } : error;

        console.error(this.format("error", message, errorData));
    }

    debug(message: string, data?: unknown) {
        if (!config.isProd) {
            console.debug(this.format("debug", message, data));
        }
    }
}

export const logger = new Logger();
