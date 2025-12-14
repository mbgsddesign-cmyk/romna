'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { StorageAdapter } from '@/lib/storage-adapter';

interface ActiveTask {
  id: string;
  title: string;
  state: 'active' | 'pending' | 'blocked' | 'done';
  ai_priority: number;
  ai_reason: string;
  due_date?: string;
  estimated_duration?: number;
}

export interface DayDecision {
  decision_id?: string;
  decision_type?: string;
  explanation?: string;
  primary_action?: string;
  secondary_actions?: string[];
  active_task: ActiveTask | null;
  active_task_reason: string;
  next_actions: string[];
  recommendations: string[];
}

interface AutoGLMDecisionContextValue {
  decision: DayDecision | null;
  loading: boolean;
  error: string | null;
  status: 'loading' | 'ready' | 'empty' | 'error';
  refetch: () => Promise<void>;
}

const AutoGLMDecisionContext = createContext<AutoGLMDecisionContextValue | undefined>(undefined);

export function AutoGLMDecisionProvider({ children }: { children: ReactNode }) {
  const { user, userId, isLocal } = useAuth();
  const [decision, setDecision] = useState<DayDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const hasFetchedRef = useRef(false);

  // Memoize userId to prevent unnecessary re-fetches
  const activeUserId = useMemo(() => userId, [userId]);

  const fetchDecision = useCallback(async () => {
    if (!activeUserId) {
      setLoading(false);
      setStatus('empty');
      hasFetchedRef.current = true;
      return;
    }

    setLoading(true);
    setStatus('loading');
    setError(null);

    // Support Local User - Client Side "AI" Decision
    if (isLocal) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const nowStr = new Date().toISOString();

        // Fetch local tasks due today or overdue
        const tasks = await StorageAdapter.getTasks(activeUserId, true);
        const activeOrPending = tasks.filter(t =>
          (t.status === 'active' || t.status === 'pending') &&
          (!t.due_date || t.due_date <= nowStr || t.due_date.startsWith(today))
        );

        if (activeOrPending.length > 0) {
          // Simple heuristic: First high priority, or first due, or just first
          const topTask = activeOrPending.sort((a, b) => {
            const pA = a.priority === 'high' ? 2 : a.priority === 'medium' ? 1 : 0;
            const pB = b.priority === 'high' ? 2 : b.priority === 'medium' ? 1 : 0;
            return pB - pA;
          })[0];

          const localDecision: DayDecision = {
            active_task: {
              id: topTask.id,
              title: topTask.title,
              state: 'active',
              ai_priority: topTask.priority === 'high' ? 90 : 50,
              ai_reason: topTask.description || "This is your highest priority task right now.",
              due_date: topTask.due_date
            },
            active_task_reason: "Prioritized based on schedule.",
            next_actions: [],
            recommendations: [],
            primary_action: 'execute'
          };
          setDecision(localDecision);
          setStatus('ready');
        } else {
          setDecision(null);
          setStatus('empty');
        }
      } catch (err) {
        console.error("Local decision error", err);
        setStatus('error');
      } finally {
        setLoading(false);
        hasFetchedRef.current = true;
      }
      return;
    }

    // Remote User - Server AI Decision
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/autoglm/orchestrate?userId=${activeUserId}`, {
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.decision) {
        setDecision(data.decision);
        setStatus(data.decision.active_task ? 'ready' : 'empty');
      } else {
        setDecision(null);
        setStatus('empty');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('[AutoGLM Decision] Request timeout');
        setError('Request timeout. Please try again.');
      } else {
        console.error('[AutoGLM Decision] Fetch error:', err);
        setError(err.message || 'Failed to fetch decision');
      }
      setDecision(null);
      setStatus('error');
    } finally {
      setLoading(false);
      hasFetchedRef.current = true;
    }
  }, [activeUserId, isLocal]);

  useEffect(() => {
    // Reset fetch state if user changes
    hasFetchedRef.current = false;
    if (activeUserId) {
      fetchDecision();
    }
  }, [activeUserId, fetchDecision]);

  const refetch = useCallback(async () => {
    hasFetchedRef.current = false;
    await fetchDecision();
  }, [fetchDecision]);

  return (
    <AutoGLMDecisionContext.Provider
      value={{
        decision,
        loading,
        error,
        status,
        refetch,
      }}
    >
      {children}
    </AutoGLMDecisionContext.Provider>
  );
}

export function useAutoGLMDecision() {
  const context = useContext(AutoGLMDecisionContext);
  if (!context) {
    throw new Error('useAutoGLMDecision must be used within AutoGLMDecisionProvider');
  }
  return context;
}