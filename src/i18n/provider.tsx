import React from 'react';
import { setLocale as setI18nLocale, t as baseT, type Locale } from 'i18n';

// Single source of truth key for persistence
const LANG_KEY = 'app.lang';

// Keep in sync with src/i18n/index.ts Locale
// Only user-facing options; keep 'pseudo' internal if present
const SUPPORTED: Locale[] = ['en-US', 'pt-BR', 'es-ES'];

export type I18nContext = {
  lang: Locale;
  setLang: (l: Locale) => void;
  t: typeof baseT;
};

const Ctx = React.createContext<I18nContext | null>(null);

function detectInitial(): Locale {
  // 1) Saved setting
  try {
    const saved = localStorage.getItem(LANG_KEY) as Locale | null;
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {}

  // 2) Optional: navigator hint
  if (typeof navigator !== 'undefined') {
    const n =
      navigator.language || (navigator.languages && navigator.languages[0]);
    if (n) {
      const low = n.toLowerCase();
      if (low.startsWith('pt')) return 'pt-BR';
      if (low.startsWith('en')) return 'en-US';
      if (low.startsWith('es')) return 'es-ES';
    }
  }

  // 3) Base language (see i18n/index.ts)
  return 'en-US';
}

/**
 * i18n initialization and provider.
 *
 * Maintainer/AI note:
 * This provider handles locale detection, persistence, and synchronization.
 * User-facing copy should always be accessed via the `t` function provided here.
 * Avoid hardcoding strings in JSX; always add them to the locale JSON files.
 */
export const I18nProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [lang, setLangState] = React.useState<Locale>(() => {
    const initial = detectInitial();
    setI18nLocale(initial);
    return initial;
  });

  const setLang = React.useCallback((nextLang: Locale) => {
    setI18nLocale(nextLang);
    setLangState(nextLang);
  }, []);

  React.useEffect(() => {
    // Persist to storage
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {}

    // Mirror to cookie for future SSR compatibility
    try {
      document.cookie = `lang=${lang}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
    } catch {}

    // Update document language metadata
    try {
      document.documentElement.lang = lang;
      document.documentElement.setAttribute('data-lang', lang);
    } catch {}
  }, [lang]);

  const value = React.useMemo(
    () => ({ lang, setLang, t: baseT }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useI18n = () => {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
