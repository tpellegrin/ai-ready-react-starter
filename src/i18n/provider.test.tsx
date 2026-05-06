/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { setLocale as setI18nLocale } from 'i18n';
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

describe('I18nProvider', () => {
  beforeEach(() => {
    setI18nLocale('en-US');
  });

  it('renders with default language (en-US)', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('lang')).toHaveTextContent('en-US');
    expect(screen.getByTestId('cta')).toHaveTextContent('Get Started');
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

  it('restores initial language from localStorage', () => {
    localStorage.setItem('app.lang', 'es-ES');

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('lang')).toHaveTextContent('es-ES');
    expect(screen.getByTestId('cta')).toHaveTextContent('Comenzar');
  });

  it('falls back to default if localStorage has unsupported language', () => {
    localStorage.setItem('app.lang', 'fr-FR');

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('lang')).toHaveTextContent('en-US');
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
});
