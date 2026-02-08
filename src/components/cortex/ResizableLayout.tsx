"use client";

import React, { useState, useCallback, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface ResizableLayoutProps {
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
}

export function ResizableLayout({ leftPanel, rightPanel }: ResizableLayoutProps) {
    const [isResizing, setIsResizing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(35); // Percentage
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Handle window resize for mobile detection
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing && !isMobile) {
                const newWidth = (mouseMoveEvent.clientX / window.innerWidth) * 100;
                if (newWidth > 15 && newWidth < 60) {
                    setSidebarWidth(newWidth);
                }
            }
        },
        [isResizing, isMobile]
    );

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    if (isMobile) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <aside className="w-full h-[40%] flex-shrink-0 border-b border-white/10 flex flex-col relative z-20 bg-black/50 backdrop-blur-xl">
                    {leftPanel}
                </aside>
                <main className="flex-1 overflow-hidden relative z-10 bg-zinc-950 flex flex-col">
                    {rightPanel}
                </main>
            </div>
        );
    }

    return (
        <div className="flex-1 flex overflow-hidden relative" onMouseUp={stopResizing}>
            <aside
                className={`relative flex flex-col border-r border-white/10 z-20 bg-black/50 backdrop-blur-xl transition-all duration-75 ${isCollapsed ? "w-[60px]" : ""
                    }`}
                style={{ width: isCollapsed ? "60px" : `${sidebarWidth}%` }}
            >
                <div className="flex-1 overflow-hidden relative">
                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="absolute top-2 right-2 z-50 p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-white"
                    >
                        {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>

                    <div className={`h-full w-full ${isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                        {leftPanel}
                    </div>
                </div>

                {/* Drag Handle */}
                {!isCollapsed && (
                    <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-indigo-500/50 cursor-col-resize z-50 transition-colors"
                        onMouseDown={startResizing}
                    />
                )}
            </aside>

            <main className="flex-1 overflow-hidden relative z-10 bg-zinc-950 flex flex-col">
                {rightPanel}
            </main>
        </div>
    );
}
