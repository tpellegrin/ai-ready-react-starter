import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from 'test/utils';

import { Button } from './index';

describe('Button', () => {
  it('uses the label as its accessible name and hides decorative icons', () => {
    renderWithProviders(
      <Button label="Save" startIcon={<svg data-testid="icon" />} />,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('stays focusable but inert while pending, and does not submit forms', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    renderWithProviders(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <Button
          type="submit"
          label="Save"
          pendingLabel="Saving…"
          isPending
          onClick={onClick}
        />
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Saving…' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();

    await user.click(button);
    await user.tab();
    await user.tab({ shift: true });
    expect(button).toHaveFocus();
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
