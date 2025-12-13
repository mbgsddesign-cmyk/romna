'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { AuthProvider } from '@/lib/auth-context';
import { RomnaAIProvider } from '@/contexts/romna-ai-context';
import { AutoGLMDecisionProvider } from '@/contexts/autoglm-decision-context';
import { ProtectedRoute } from './protected-route';

export function Providers({ children }: { children: ReactNode }) {
  const { locale, theme } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem
      disableTransitionOnChange={false}
      storageKey="romna-theme"
    >
      <AuthProvider>
        <AutoGLMDecisionProvider>
          <RomnaAIProvider>
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          </RomnaAIProvider>
        </AutoGLMDecisionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}