'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';

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
  const { user } = useAuth();
  const [decision, setDecision] = useState<DayDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const hasFetchedRef = useRef(false);
  
  const userId = useMemo(() => user?.id, [user?.id]);

  const fetchDecision = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setStatus('empty');
      hasFetchedRef.current = true;
      return;
    }

    setLoading(true);
    setStatus('loading');
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/autoglm/orchestrate?userId=${userId}`, {
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
  }, [userId]);

  useEffect(() => {
    if (!hasFetchedRef.current && userId) {
      fetchDecision();
    }
  }, [fetchDecision, userId]);

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