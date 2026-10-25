import React from 'react';
import {
  DEFAULT_LOCALE,
  setLocale as setI18nLocale,
  translate,
  type I18nKey,
  type Locale,
  type TranslationParams,
} from 'i18n';

// Single source of truth key for persistence
const LANG_KEY = 'app.lang';

// Keep in sync with src/i18n/index.ts Locale
// Only user-facing options; keep 'pseudo' internal if present
const SUPPORTED: Locale[] = ['en-US', 'pt-BR', 'es-ES'];

export type I18nContext = {
  lang: Locale;
  setLang: (l: Locale) => void;
  /** Bound to `lang`: a new function per locale, so memoized copy updates. */
  t: (key: I18nKey, params?: TranslationParams) => string;
};

const Ctx = React.createContext<I18nContext | null>(null);

function detectInitial(): Locale {
  // 1) Saved setting
  try {
    const saved = localStorage.getItem(LANG_KEY) as Locale | null;
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {
    // Storage can be unavailable (privacy modes, blocked cookies): fall through.
  }

  // 2) Optional: navigator hint. A product whose language should not follow
  // the browser's deletes this block (docs/adoption.md).
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

  // 3) The product's default language (see i18n/index.ts)
  return DEFAULT_LOCALE;
}

/**
 * i18n initialization and provider.
 *
 * Maintainer/AI note:
 * This provider handles locale detection, persistence, and synchronization.
 * User-facing copy should always be accessed via the `t` function provided here.
 * Avoid hardcoding strings in JSX; always add them to the locale JSON files.
 */
export const I18nProvider: React.FC<
  React.PropsWithChildren<{
    /** Start in this locale (stories, tests) instead of detecting it. */
    initialLocale?: Locale | undefined;
  }>
> = ({ children, initialLocale }) => {
  const [lang, setLangState] = React.useState<Locale>(() => {
    const initial = initialLocale ?? detectInitial();
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
    } catch {
      // Storage unavailable: the choice still applies for this session.
    }

    // Mirror to cookie for future SSR compatibility
    try {
      document.cookie = `lang=${lang}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
    } catch {
      // Cookies can be blocked; the cookie is only a hint for future SSR.
    }

    // Update document language metadata
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-lang', lang);
  }, [lang]);

  const t = React.useCallback(
    (key: I18nKey, params?: TranslationParams) => translate(lang, key, params),
    [lang],
  );

  const value = React.useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useI18n = () => {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
