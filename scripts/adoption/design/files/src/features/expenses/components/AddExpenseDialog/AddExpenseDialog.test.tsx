/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';

import { appConfig } from 'config';
import { server } from 'mocks/node';
import { renderWithProviders } from 'test/utils';

import { expenseHandlers } from '../../mocks';

import { AddExpenseDialog } from './index';

/** The page's wiring: a button that opens the dialog. */
const Harness = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Add expense
      </button>
      <AddExpenseDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

const open = async () => {
  const user = userEvent.setup();
  renderWithProviders(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Add expense' }));
  const dialog = await screen.findByRole('dialog', { name: 'Add expense' });
  return { user, dialog };
};

describe('AddExpenseDialog', () => {
  beforeEach(() => {
    server.use(...expenseHandlers);
  });

  it('starts in Description, with Meals as the category', async () => {
    await open();
    expect(screen.getByLabelText(/Description/)).toHaveFocus();
    expect(screen.getByLabelText(/Category/)).toHaveValue('meals');
  });

  it('shows errors under each missing field and focuses the first; nothing is sent', async () => {
    const posted = vi.fn();
    server.use(
      http.post(`${appConfig.apiBaseUrl}/expenses`, () => {
        posted();
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const description = screen.getByLabelText(/Description/);
    expect(description).toHaveFocus();
    expect(description).toHaveAccessibleDescription(/required/i);
    expect(screen.getByLabelText(/Amount/)).toHaveAccessibleDescription(
      /required/i,
    );
    expect(posted).not.toHaveBeenCalled();
  });

  it("puts the server's field errors next to the field and keeps the input", async () => {
    const { user } = await open();
    await user.type(screen.getByLabelText(/Description/), 'Team lunch');
    await user.type(screen.getByLabelText(/Amount/), '12.5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('This is already in use.')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please fix the highlighted fields.',
    );
    expect(screen.getByLabelText(/Description/)).toHaveValue('Team lunch');
  });

  it('saves, closes, confirms and starts empty next time', async () => {
    const { user } = await open();
    await user.type(screen.getByLabelText(/Description/), 'Taxi');
    await user.type(screen.getByLabelText(/Amount/), '23');
    await user.selectOptions(screen.getByLabelText(/Category/), 'Travel');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      (await screen.findAllByText('Expense added')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(await screen.findByLabelText(/Description/)).toHaveValue('');
  });

  it('forgets what was typed when cancelled', async () => {
    const { user } = await open();
    await user.type(screen.getByLabelText(/Description/), 'Draft');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(await screen.findByLabelText(/Description/)).toHaveValue('');
  });
});
