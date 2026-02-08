"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Loader2, Code, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";

mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    themeVariables: {
        fontFamily: "Inter, sans-serif",
        primaryColor: "#6366f1", // Indigo 500
        primaryTextColor: "#fff",
        primaryBorderColor: "#4338ca", // Indigo 700
        lineColor: "#a1a1aa", // Zinc 400
        secondaryColor: "#18181b", // Zinc 900
        tertiaryColor: "#27272a", // Zinc 800
    },
});

interface MermaidEmbedProps {
    dslCode?: string;
    role?: string;
    title?: string;
    isLoading?: boolean;
}

export function MermaidEmbed({
    dslCode,
    role = "View",
    title = "System Diagram",
    isLoading = false,
}: MermaidEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgContent, setSvgContent] = useState<string>("");
    const [renderError, setRenderError] = useState<string | null>(null);
    const [showCode, setShowCode] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (dslCode && containerRef.current) {
            const renderDiagram = async () => {
                try {
                    setRenderError(null);
                    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                    const { svg } = await mermaid.render(id, dslCode);
                    setSvgContent(svg);
                } catch (error) {
                    console.error("Mermaid Render Error:", error);
                    setRenderError("Failed to render diagram. Syntax might be invalid.");
                }
            };
            renderDiagram();
        }
    }, [dslCode]);

    if (isLoading) {
        return (
            <div className="w-full h-64 bg-zinc-900/50 border border-white/10 rounded-xl flex flex-col items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                <p className="text-zinc-400 text-sm">Generating {role} Diagram...</p>
            </div>
        );
    }

    if (!dslCode) return null;

    return (
        <div
            className={`w-full bg-zinc-950 border border-white/10 rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? "fixed inset-4 z-50 h-[calc(100vh-2rem)] border-indigo-500/50 shadow-2xl" : "hover:border-indigo-500/30"
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-5 h-5"
                        >
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">{title}</h3>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold bg-zinc-900 px-1.5 py-0.5 rounded">
                            {role} View
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button
                        onClick={() => setShowCode(!showCode)}
                        className={`p-2 rounded-lg transition-colors ${showCode ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
                            }`}
                        title="View Source"
                    >
                        <Code className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"
                        title={isExpanded ? "Minimize" : "Maximize"}
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="relative w-full bg-[#0D0D0D] overflow-hidden" style={{ height: isExpanded ? "calc(100% - 57px)" : "400px" }}>
                {showCode ? (
                    <div className="absolute inset-0 p-4 overflow-auto">
                        <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap">{dslCode}</pre>
                    </div>
                ) : renderError ? (
                    <div className="flex items-center justify-center h-full text-red-400 text-sm">
                        {renderError}
                    </div>
                ) : (
                    <div
                        ref={containerRef}
                        className="w-full h-full flex items-center justify-center overflow-auto p-4 cursor-grab active:cursor-grabbing"
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                        style={{
                            transform: `scale(${zoom})`,
                            transition: 'transform 0.2s ease-out',
                            transformOrigin: 'center'
                        }}
                    />
                )}
            </div>
        </div>
    );
}
