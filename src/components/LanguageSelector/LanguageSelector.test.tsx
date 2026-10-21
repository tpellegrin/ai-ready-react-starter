import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useI18n } from 'i18n/provider';
import { renderWithProviders } from 'test/utils';

import { LanguageSelector } from './index';

const CurrentTitle = () => {
  const { t } = useI18n();
  return <h1>{t('user.dashboard.title')}</h1>;
};

describe('LanguageSelector', () => {
  it('is a labelled native select that switches the interface language', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <LanguageSelector />
        <CurrentTitle />
      </>,
    );
    const select = screen.getByRole('combobox', { name: 'Language selector' });
    expect(select).toHaveValue('en-US');
    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();

    await user.selectOptions(select, 'es-ES');
    expect(screen.getByRole('heading', { name: 'Panel' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Selector de idioma' }),
    ).toHaveValue('es-ES');
    expect(document.documentElement).toHaveAttribute('lang', 'es-ES');
  });
});
