/** @vitest-environment jsdom */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { appConfig } from 'config';
import { injectFault } from 'mocks/faults';
import { server } from 'mocks/node';
import { renderWithProviders } from 'test/utils';

import { invoiceFixtures } from '../../mocks';
import { InvoicesPanel } from '../InvoicesPanel';

import { InvoiceForm } from './index';

const url = `${appConfig.apiBaseUrl}/invoices`;

const renderForm = () =>
  renderWithProviders(
    <>
      <InvoiceForm />
      <InvoicesPanel />
    </>,
  );

const customer = () => screen.getByRole('textbox', { name: /customer/i });
const amount = () => screen.getByRole('textbox', { name: /amount/i });
const submit = () => screen.getByRole('button', { name: 'Create invoice' });

describe('InvoiceForm', () => {
  it('validates on the client before sending anything', async () => {
    const user = userEvent.setup();
    const posted = vi.fn();
    server.use(
      http.post(url, () => {
        posted();
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    renderForm();

    await user.click(submit());

    expect(customer()).toHaveAccessibleDescription(/required/i);
    expect(customer()).toHaveFocus();
    expect(amount()).toHaveAccessibleDescription(/required/i);
    expect(posted).not.toHaveBeenCalled();
  });

  it('creates an invoice, then shows it in the refreshed list', async () => {
    const user = userEvent.setup();
    const created = {
      id: 'invoices-3',
      name: 'Initech',
      updatedAt: '2026-03-01T10:00:00.000Z',
    };
    const bodies: unknown[] = [];
    let saved = false;
    server.use(
      http.get(url, () =>
        HttpResponse.json({
          items: saved ? [...invoiceFixtures, created] : invoiceFixtures,
        }),
      ),
      http.post(url, async ({ request }) => {
        bodies.push(await request.json());
        saved = true;
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    renderForm();
    await screen.findByRole('list', { name: 'Invoices' });

    await user.type(customer(), 'Initech');
    await user.type(amount(), '980.25');
    await user.click(submit());

    const list = screen.getByRole('list', { name: 'Invoices' });
    expect(
      await within(list).findByRole('heading', { name: 'Initech' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Invoice created')).toBeInTheDocument();
    expect(customer()).toHaveValue('');
    expect(bodies).toEqual([{ name: 'Initech', amount: 980.25 }]);
  });

  it('puts the server’s field errors next to the field, keeping the input', async () => {
    const user = userEvent.setup();
    const taken = invoiceFixtures[0]?.name ?? '';
    renderForm();

    await user.type(customer(), taken);
    await user.type(amount(), '10');
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /fix the highlighted fields/i,
    );
    expect(customer()).toHaveAccessibleDescription(/already in use/i);
    expect(customer()).toHaveValue(taken);
  });

  it('explains other failures and keeps the input, so submitting again retries', async () => {
    const user = userEvent.setup();
    injectFault('invoices.create');
    renderForm();

    await user.type(customer(), 'Initech');
    await user.type(amount(), '10');
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong on our side',
    );
    expect(customer()).toHaveValue('Initech');

    await user.click(submit());
    await waitFor(() => expect(customer()).toHaveValue(''));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
