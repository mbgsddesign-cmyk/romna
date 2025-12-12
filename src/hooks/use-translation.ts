'use client';

import { useAppStore } from '@/lib/store';
import { translations, TranslationKey } from '@/lib/i18n';

export function useTranslation() {
  const locale = useAppStore((state) => state.locale);
  
  const t = (key: TranslationKey): string => {
    return translations[locale][key];
  };

  return { t, locale };
}
