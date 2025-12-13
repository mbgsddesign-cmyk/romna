'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

export interface AIResponse {
  message: string;
  timestamp: Date;
  type?: 'suggest' | 'question' | 'execute' | 'nothing' | 'error';
  intent?: string;
  suggestions?: string[];
  action?: string;
  result?: unknown;
}

interface RomnaAIContextValue {
  askRomna: (text: string) => Promise<AIResponse>;
  isLoading: boolean;
  lastResponse?: AIResponse;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const RomnaAIContext = createContext<RomnaAIContextValue | undefined>(undefined);

export function RomnaAIProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIResponse | undefined>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const askRomna = useCallback(async (text: string): Promise<AIResponse> => {
    console.log('[Ask ROMNA] Request:', text);
    setIsLoading(true);

    try {
      const response = await fetch('/api/autoglm/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          source: 'ask-romna',
          userId: user?.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      console.log('[Ask ROMNA] Response received:', response.status);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      const aiResponse: AIResponse = {
        message: data.message || 'No response',
        timestamp: new Date(),
        type: data.type,
        action: data.action,
        result: data.result,
      };

      setLastResponse(aiResponse);
      console.log('[Ask ROMNA] AI response:', aiResponse.message);
      
      return aiResponse;
    } catch (error) {
      console.error('[Ask ROMNA] Error:', error);
      
      const errorResponse: AIResponse = {
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        type: 'error',
      };
      
      setLastResponse(errorResponse);
      return errorResponse;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const openDrawer = useCallback(() => {
    console.log('[Ask ROMNA] Drawer opened');
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    console.log('[Ask ROMNA] Drawer closed');
    setIsDrawerOpen(false);
  }, []);

  return (
    <RomnaAIContext.Provider
      value={{
        askRomna,
        isLoading,
        lastResponse,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </RomnaAIContext.Provider>
  );
}

export function useRomnaAI() {
  const context = useContext(RomnaAIContext);
  if (!context) {
    throw new Error('useRomnaAI must be used within RomnaAIProvider');
  }
  return context;
}