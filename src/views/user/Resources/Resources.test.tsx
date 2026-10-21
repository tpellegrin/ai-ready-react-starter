/** @vitest-environment jsdom */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';

import { injectFault } from 'mocks/faults';
import { server } from 'mocks/node';
import { renderApp, type RouteTable } from 'test/app';
import { createFakeAuthAdapter, testUser } from 'test/auth';

import { Resources } from './index';

window.HTMLElement.prototype.scrollTo = vi.fn();

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{`${pathname}${search}`}</output>;
};

const routes: RouteTable = {
  guest: [],
  onboarding: [],
  user: [
    {
      path: '/resources',
      element: (
        <>
          <Resources />
          <LocationProbe />
        </>
      ),
    },
  ],
};

const renderResources = (initialPath = '/resources') =>
  renderApp({
    routes,
    initialPath,
    adapter: createFakeAuthAdapter({ user: testUser }),
  });

const list = () => screen.findByRole('list', { name: 'Resources' });
const itemNames = async () =>
  within(await list())
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);
const dialog = () => screen.findByRole('dialog');

describe('Resources (reference feature, full data path)', () => {
  it('shows loading, then the list from the API (featured first)', async () => {
    renderResources();
    const loading = await screen.findByText('Loading resources…');
    expect(loading.closest('[role="status"]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(await itemNames()).toEqual([
      'Alpha resource',
      'Beta resource',
      'Gamma resource',
    ]);
  });

  it('shows the empty state with a next step', async () => {
    server.use(
      http.get('/api/resources', () => HttpResponse.json({ items: [] })),
    );
    renderResources();
    expect(
      await screen.findByRole('heading', { name: 'No resources yet' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New resource' }),
    ).toBeInTheDocument();
  });

  it('recovers from a failed load through the visible retry action', async () => {
    const user = userEvent.setup();
    injectFault('resources.list');
    renderResources();

    const title = await screen.findByText("We couldn't load resources");
    const alert = title.closest<HTMLElement>('[role="alert"]');
    if (!alert) throw new Error('error state is not announced as an alert');
    expect(alert).toHaveTextContent('Something went wrong on our side');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await itemNames()).toHaveLength(3);
  });

  it('treats a malformed API payload as an error instead of rendering it', async () => {
    server.use(
      http.get('/api/resources', () =>
        HttpResponse.json({ items: [{ id: 1, title: 'wrong' }] }),
      ),
    );
    renderResources();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server sent a response we could not read',
    );
  });

  it('reads the filter from the URL and writes changes back (keeping focus)', async () => {
    const user = userEvent.setup();
    renderResources('/resources?status=archived');

    expect(await itemNames()).toEqual(['Gamma resource']);
    const filter = screen.getByRole('combobox', { name: 'Status' });
    expect(filter).toHaveValue('archived');

    await user.selectOptions(filter, 'active');
    await waitFor(async () =>
      expect(await itemNames()).toEqual(['Alpha resource', 'Beta resource']),
    );
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/resources?status=active',
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveFocus();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'all',
    );
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/resources$/),
    );
  });

  it('validates the create form on the client and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    renderResources();
    await list();

    await user.click(screen.getByRole('button', { name: 'New resource' }));
    const form = await dialog();
    expect(
      within(form).getByRole('heading', { name: 'New resource' }),
    ).toBeInTheDocument();

    await user.click(within(form).getByRole('button', { name: 'Save' }));

    const name = within(form).getByRole('textbox', { name: 'Name' });
    await waitFor(() => expect(name).toHaveFocus());
    expect(name).toHaveAccessibleDescription(
      'Up to 60 characters. Must be unique. This field is required.',
    );
    expect(
      within(form).getByRole('textbox', { name: 'Quantity' }),
    ).toHaveAccessibleDescription(
      'A whole number from 0 to 9,999. This field is required.',
    );
  });

  it('creates a resource, invalidates the list and confirms with a toast', async () => {
    const user = userEvent.setup();
    renderResources();
    await list();

    await user.click(screen.getByRole('button', { name: 'New resource' }));
    const form = await dialog();
    await user.type(
      within(form).getByRole('textbox', { name: 'Name' }),
      'Delta resource',
    );
    await user.type(
      within(form).getByRole('textbox', { name: 'Quantity' }),
      '1500',
    );
    await user.click(within(form).getByRole('radio', { name: 'Archived' }));
    await user.click(within(form).getByRole('checkbox', { name: 'Featured' }));
    await user.click(within(form).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Resource created')).toBeInTheDocument();
    expect(await itemNames()).toEqual([
      'Alpha resource',
      'Delta resource',
      'Beta resource',
      'Gamma resource',
    ]);
    expect(screen.getByText(/Quantity: 1,500/)).toBeInTheDocument();
  });

  it('shows server-side validation errors next to the field', async () => {
    const user = userEvent.setup();
    renderResources();
    await list();

    await user.click(screen.getByRole('button', { name: 'New resource' }));
    const form = await dialog();
    await user.type(
      within(form).getByRole('textbox', { name: 'Name' }),
      'alpha RESOURCE',
    );
    await user.type(
      within(form).getByRole('textbox', { name: 'Quantity' }),
      '1',
    );
    await user.click(within(form).getByRole('button', { name: 'Save' }));

    const name = within(form).getByRole('textbox', { name: 'Name' });
    await waitFor(() =>
      expect(name).toHaveAccessibleDescription(
        'Up to 60 characters. Must be unique. This is already in use.',
      ),
    );
    expect(name).toHaveFocus();
    expect(within(form).getByRole('alert')).toHaveTextContent(
      'Please fix the highlighted fields.',
    );
  });

  it('edits in a dialog with prefilled values and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderResources();
    await list();

    const editBeta = screen.getByRole('button', { name: 'Edit Beta resource' });
    await user.click(editBeta);
    const form = await dialog();
    expect(
      within(form).getByRole('heading', { name: 'Edit resource' }),
    ).toBeInTheDocument();
    expect(within(form).getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Beta resource',
    );
    const quantity = within(form).getByRole('textbox', { name: 'Quantity' });
    expect(quantity).toHaveValue('1,250');

    await user.clear(quantity);
    await user.type(quantity, '7');
    await user.click(within(form).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Resource saved')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText(/Quantity: 7 ·/)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Edit Beta resource' }),
      ).toHaveFocus(),
    );
  });

  it('closes the dialog with Escape without saving', async () => {
    const user = userEvent.setup();
    renderResources();
    await list();

    await user.click(
      screen.getByRole('button', { name: 'Edit Alpha resource' }),
    );
    await dialog();
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.getByRole('button', { name: 'Edit Alpha resource' }),
    ).toHaveFocus();
  });

  it('shows a form-level error when saving fails on the server', async () => {
    const user = userEvent.setup();
    injectFault('resources.save');
    renderResources();
    await list();

    await user.click(
      screen.getByRole('button', { name: 'Edit Alpha resource' }),
    );
    const form = await dialog();
    await user.click(within(form).getByRole('button', { name: 'Save' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Something went wrong on our side',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('confirms before deleting, keeps the dialog open on failure, then deletes', async () => {
    const user = userEvent.setup();
    injectFault('resources.delete');
    renderResources();
    await list();

    await user.click(
      screen.getByRole('button', { name: 'Delete Gamma resource' }),
    );
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveAccessibleName('Delete this resource?');
    expect(
      within(confirm).getByRole('button', { name: 'Cancel' }),
    ).toHaveFocus();

    await user.click(
      within(confirm).getByRole('button', { name: 'Delete resource' }),
    );
    expect(await within(confirm).findByRole('alert')).toHaveTextContent(
      'Something went wrong on our side',
    );

    await user.click(
      within(confirm).getByRole('button', { name: 'Delete resource' }),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await screen.findByText('Resource deleted')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await itemNames()).toEqual(['Alpha resource', 'Beta resource']),
    );
    // The opener (the deleted row's button) is gone: focus moves to a
    // sensible next action instead of being lost.
    expect(screen.getByRole('button', { name: 'New resource' })).toHaveFocus();
  });

  it('switches language while mounted (including data-derived copy)', async () => {
    const user = userEvent.setup();
    renderResources();
    await list();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Language selector' }),
      'pt-BR',
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recursos' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Novo recurso' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Quantidade: 1\.250/)).toBeInTheDocument();
  });
});
