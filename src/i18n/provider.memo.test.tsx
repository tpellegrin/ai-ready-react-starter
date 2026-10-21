import { act, render, screen } from '@testing-library/react';
import { useMemo } from 'react';

import { I18nProvider, useI18n } from './provider';

/** A component that memoizes derived copy, as exhaustive-deps encourages. */
const MemoizedLabel = () => {
  const { t, setLang } = useI18n();
  const label = useMemo(() => t('common.actions.continue'), [t]);
  return (
    <>
      <p data-testid="label">{label}</p>
      <button type="button" onClick={() => setLang('pt-BR')}>
        pt
      </button>
    </>
  );
};

describe('I18nProvider translation function', () => {
  it('changes identity with the locale so memoized copy updates', () => {
    render(
      <I18nProvider>
        <MemoizedLabel />
      </I18nProvider>,
    );
    expect(screen.getByTestId('label')).toHaveTextContent('Continue');

    act(() => {
      screen.getByRole('button', { name: 'pt' }).click();
    });

    expect(screen.getByTestId('label')).toHaveTextContent('Continuar');
  });
});
