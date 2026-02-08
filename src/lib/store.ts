import { create } from 'zustand';

export type ViewType = 'IDLE' | 'SCHEMA' | 'TABLE' | 'CHART' | 'GHOST_MODE' | 'INVITE' | 'MIGRATION' | 'DB_CONNECT';

interface CortexState {
    currentView: ViewType;
    data: unknown;
    schemaData: unknown; // Persist schema for backgrounds
    ghostHighlight: string | null;
    isLoading: boolean;

    // Actions
    setView: (view: ViewType, data?: unknown) => void;
    setGhostMode: (tableName: string, actionSummary: string) => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
}

export const useCortexStore = create<CortexState>((set) => ({
    currentView: 'IDLE',
    data: null,
    schemaData: null,
    ghostHighlight: null,
    isLoading: false,

    setView: (view, data = null) => set((state) => ({
        currentView: view,
        data,
        schemaData: view === 'SCHEMA' ? data : state.schemaData,
        ghostHighlight: view === 'GHOST_MODE' ? state.ghostHighlight : null,
        isLoading: false
    })),

    setGhostMode: (tableName, actionSummary) => set({
        currentView: 'GHOST_MODE',
        ghostHighlight: tableName,
        data: {
            isOpen: true,
            actionSummary,
            tableName
        }
    }),

    setLoading: (loading) => set({ isLoading: loading }),
    reset: () => set({ currentView: 'IDLE', data: null, schemaData: null, ghostHighlight: null, isLoading: false }),
}));
