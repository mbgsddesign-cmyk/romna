'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function LocaleProvider() {
  const locale = useAppStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}
