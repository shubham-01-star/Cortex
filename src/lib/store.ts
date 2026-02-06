import { create } from 'zustand';

export type ViewType = 'IDLE' | 'SCHEMA' | 'TABLE' | 'CHART' | 'GHOST_MODE' | 'INVITE' | 'MIGRATION' | 'DB_CONNECT';

interface CortexState {
    currentView: ViewType;
    data: any;
    isLoading: boolean;

    // Actions
    setView: (view: ViewType, data?: any) => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
}

export const useCortexStore = create<CortexState>((set) => ({
    currentView: 'IDLE',
    data: null,
    isLoading: false,

    setView: (view, data = null) => set({ currentView: view, data, isLoading: false }),
    setLoading: (loading) => set({ isLoading: loading }),
    reset: () => set({ currentView: 'IDLE', data: null, isLoading: false }),
}));
