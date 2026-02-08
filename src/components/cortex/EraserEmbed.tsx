"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Code, Loader2, ZoomIn } from "lucide-react";
import Image from "next/image";

interface EraserEmbedProps {
    imageUrl?: string;
    editUrl?: string;
    dslCode?: string;
    title?: string;
    role?: string;
    isLoading?: boolean;
}

export function EraserEmbed({
    imageUrl,
    editUrl,
    dslCode,
    title = "System Architecture",
    role = "Developer",
    isLoading = false
}: EraserEmbedProps) {
    const [showCode, setShowCode] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    if (isLoading) {
        return (
            <div className="w-full h-64 bg-zinc-900/50 border border-white/10 rounded-xl flex flex-col items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                <p className="text-zinc-400 text-sm">Generating {role} View...</p>
                <p className="text-zinc-600 text-xs mt-2">Consulting Eraser.io API</p>
            </div>
        );
    }

    if (!imageUrl) {
        return null;
    }

    return (
        <div
            className="w-full group relative bg-zinc-950 border border-white/10 rounded-xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#E63946]/10">
                        {/* Eraser Logo Color Mock */}
                        <div className="w-4 h-4 bg-[#E63946] rounded-sm transform rotate-45" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">{title}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold bg-zinc-900 px-1.5 py-0.5 rounded">
                                {role} View
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {dslCode && (
                        <button
                            onClick={() => setShowCode(!showCode)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="View Eraser DSL"
                        >
                            <Code className="w-4 h-4" />
                        </button>
                    )}
                    {editUrl && (
                        <a
                            href={editUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors ml-2"
                        >
                            Edit <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="relative w-full aspect-video bg-[#111111]">
                {showCode ? (
                    <div className="absolute inset-0 p-4 overflow-auto bg-[#0D0D0D] font-mono text-xs text-zinc-300">
                        <pre>{dslCode}</pre>
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {/* We use standard img for external URLs to avoid Next.js domain config issues for now */}
                        <img
                            src={imageUrl}
                            alt="Eraser Diagram"
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                        />

                        {/* Overlay Actions */}
                        <div className={`absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center opacity-0 transition-opacity duration-200 ${isHovered ? 'opacity-100' : ''} pointer-events-none`}>
                            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-sm font-medium flex items-center gap-2">
                                <ZoomIn className="w-4 h-4" /> Click to Zoom
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
