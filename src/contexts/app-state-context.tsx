'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';

export type AppState =
    | 'first_launch'
    | 'idle_ready'
    | 'active_decision'
    | 'executing'
    | 'awaiting_input';

interface AppStateContextType {
    state: AppState;
    setState: (state: AppState) => void;
    transitionTo: (newState: AppState) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
    const { user, isLocal } = useAuth();
    const [state, setState] = useState<AppState>('idle_ready');
    const [hasCheckedLaunch, setHasCheckedLaunch] = useState(false);
    const locale = useAppStore((s) => s.locale);

    useEffect(() => {
        // [V6] RTL is now handled server-side in layout.tsx via cookies
        // Only handle font class switching here for client-side optimization
        if (locale === 'ar') {
            document.body.classList.add('font-cairo');
            document.body.classList.remove('font-inter');
        } else {
            document.body.classList.add('font-inter');
            document.body.classList.remove('font-cairo');
        }
    }, [locale]);

    useEffect(() => {
        // Check for first launch logic
        const checkFirstLaunch = () => {
            if (typeof window === 'undefined') return;

            const onboardingCompleted = localStorage.getItem('romna_onboarding_completed') === 'true';

            if (!onboardingCompleted) {
                setState('first_launch');
            } else {
                // Default to idle, page logic will switch to active_decision if tasks exist
                setState('idle_ready');
            }
            setHasCheckedLaunch(true);
        };

        checkFirstLaunch();
    }, [user, isLocal]);

    const transitionTo = (newState: AppState) => {
        console.log(`[AppState] Transition: ${state} -> ${newState}`);
        setState(newState);
    };

    return (
        <AppStateContext.Provider value={{ state, setState, transitionTo }}>
            {hasCheckedLaunch ? children : null} {/* Prevent flash of wrong state */}
        </AppStateContext.Provider>
    );
}

export function useAppState() {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppStateProvider');
    }
    return context;
}
