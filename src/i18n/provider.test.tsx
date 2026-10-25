/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { DEFAULT_LOCALE, setLocale as setI18nLocale } from 'i18n';
import { renderWithProviders } from 'test/utils';
import { I18nProvider, useI18n } from './provider';

const Probe: React.FC = () => {
  const { lang, setLang, t } = useI18n();

  return (
    <>
      <div data-testid="lang">{lang}</div>
      <div data-testid="cta">{t('app.welcome.cta')}</div>
      <button type="button" data-testid="pt" onClick={() => setLang('pt-BR')}>
        set-pt
      </button>
      <button type="button" data-testid="es" onClick={() => setLang('es-ES')}>
        set-es
      </button>
    </>
  );
};

/** What the browser reports as its language (jsdom: en-US). */
const browserLanguage = (language: string) =>
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('I18nProvider', () => {
  beforeEach(() => {
    setI18nLocale('en-US');
  });

  it('switches language when setLang is called', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('lang')).toHaveTextContent('en-US');

    await user.click(screen.getByTestId('pt'));

    expect(screen.getByTestId('lang')).toHaveTextContent('pt-BR');
    expect(screen.getByTestId('cta')).toHaveTextContent('Começar');
    expect(localStorage.getItem('app.lang')).toBe('pt-BR');
  });

  it('updates document lang attribute', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(document.documentElement.lang).toBe('en-US');

    await user.click(screen.getByTestId('pt'));

    expect(document.documentElement.lang).toBe('pt-BR');
  });

  describe('first language', () => {
    // The test setup saves en-US for every test (src/test/setup.ts); these
    // tests choose what is saved and what the browser says themselves.
    beforeEach(() => {
      localStorage.removeItem('app.lang');
    });

    it('starts in the default language (en-US) when nothing is saved and the browser language is not supported', () => {
      browserLanguage('fr-FR');

      render(
        <I18nProvider>
          <Probe />
        </I18nProvider>,
      );

      expect(DEFAULT_LOCALE).toBe('en-US');
      expect(screen.getByTestId('lang')).toHaveTextContent('en-US');
      expect(screen.getByTestId('cta')).toHaveTextContent('Get Started');
    });

    it("follows the browser's language when nothing is saved", () => {
      browserLanguage('pt-PT');

      render(
        <I18nProvider>
          <Probe />
        </I18nProvider>,
      );

      expect(screen.getByTestId('lang')).toHaveTextContent('pt-BR');
      expect(screen.getByTestId('cta')).toHaveTextContent('Começar');
    });

    it('restores the saved language, before the browser language', () => {
      localStorage.setItem('app.lang', 'es-ES');
      browserLanguage('pt-BR');

      render(
        <I18nProvider>
          <Probe />
        </I18nProvider>,
      );

      expect(screen.getByTestId('lang')).toHaveTextContent('es-ES');
      expect(screen.getByTestId('cta')).toHaveTextContent('Comenzar');
    });

    it('falls back to the default language if the saved one is unsupported', () => {
      localStorage.setItem('app.lang', 'fr-FR');
      browserLanguage('fr-FR');

      render(
        <I18nProvider>
          <Probe />
        </I18nProvider>,
      );

      expect(screen.getByTestId('lang')).toHaveTextContent(DEFAULT_LOCALE);
    });
  });
});

describe('the language of unit tests', () => {
  it('is English whatever the browser says (src/test/setup.ts)', () => {
    browserLanguage('pt-BR');

    renderWithProviders(<Probe />);

    expect(screen.getByTestId('lang')).toHaveTextContent('en-US');
    expect(screen.getByTestId('cta')).toHaveTextContent('Get Started');
  });
});
