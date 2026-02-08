"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "./button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[ErrorBoundary] Error caught in ${this.props.name || "Component"}:`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-8 bg-zinc-950/50 rounded-xl border border-red-500/20 backdrop-blur-sm text-center space-y-4">
                    <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-white">
                            {this.props.name ? `${this.props.name} Error` : "Something went wrong"}
                        </h3>
                        <p className="text-zinc-400 text-sm max-w-sm">
                            {this.state.error?.message || "An unexpected error occurred in this section of the application."}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={this.handleReset}
                        className="flex items-center gap-2 border-zinc-800 hover:bg-zinc-900"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
