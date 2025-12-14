'use client';

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '@/lib/auth-context';
import { FeedbackEngine } from '@/lib/feedback-engine';
import { useAppStore } from '@/lib/store';

export function FeedbackListener() {
    const { user } = useAuth();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!user) {
            // Cleanup if user logs out
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            return;
        }

        // Only subscribe if not already subscribed
        if (channelRef.current) return;

        const channel = supabase
            .channel('romna-execution-feedback')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'execution_queue',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    // Global Data Refresh
                    useAppStore.getState().triggerRefresh();

                    const newData = payload.new as any;
                    const oldData = payload.old as any;

                    // 1. Check for EXECUTION completion
                    // Transition to 'executed'
                    if (newData.status === 'executed' && oldData.status !== 'executed') {
                        FeedbackEngine.dispatch('EXECUTED');
                    }

                    // Transition to 'failed' (ERROR)
                    if (newData.status === 'failed' && oldData.status !== 'failed') {
                        FeedbackEngine.dispatch('ERROR');
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'execution_queue',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    // Global Data Refresh
                    useAppStore.getState().triggerRefresh();

                    const newData = payload.new as any;

                    // 2. Check for newly SCHEDULED items (Waiting for worker or future)
                    if (newData.status === 'scheduled') {
                        FeedbackEngine.dispatch('SCHEDULED');
                    }
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [user]);

    // Also listen for Execution Plans that need approval AND Cancellation
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('romna-approval-feedback')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'execution_plans',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    // Global Data Refresh
                    useAppStore.getState().triggerRefresh();

                    const newData = payload.new as any;
                    // Approval
                    if (newData.status === 'waiting_approval' && (payload.eventType === 'INSERT' || (payload.old as any)?.status !== 'waiting_approval')) {
                        FeedbackEngine.dispatch('APPROVAL_REQUIRED');
                    }
                    // Cancellation
                    if (newData.status === 'cancelled' && (payload.old as any)?.status !== 'cancelled') {
                        FeedbackEngine.dispatch('CANCELLED');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return null; // Headless component
}
