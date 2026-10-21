import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen, waitFor, within } from 'storybook/test';

import { injectFault } from 'mocks/faults';

import type { ResourceFilter } from '../../model';
import { resourceDb, resourceFixtures } from '../../mocks';

import { ResourceCatalog } from './index';

/** The route owns the filter (a URL parameter in the app). */
const CatalogWithFilter = ({
  initialFilter,
}: {
  initialFilter: ResourceFilter;
}) => {
  const [filter, setFilter] = useState(initialFilter);
  return <ResourceCatalog filter={filter} onFilterChange={setFilter} />;
};

const meta = {
  title: 'Features/Resources/ResourceCatalog',
  component: CatalogWithFilter,
  args: { initialFilter: 'all' },
} satisfies Meta<typeof CatalogWithFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

const itemNames = async (canvasElement: HTMLElement) =>
  within(await within(canvasElement).findByRole('list', { name: 'Resources' }))
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);

export const Default: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(await itemNames(canvasElement)).toEqual([
      'Alpha resource',
      'Beta resource',
      'Gamma resource',
    ]);
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: 'Status' }),
      'archived',
    );
    await waitFor(async () =>
      expect(await itemNames(canvasElement)).toEqual(['Gamma resource']),
    );
  },
};

export const Empty: Story = {
  beforeEach: () => {
    for (const resource of resourceFixtures) resourceDb.remove(resource.id);
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'No resources yet' }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'New resource' }),
    ).toBeInTheDocument();
  },
};

/** A failed load is recoverable in place through "Try again". */
export const LoadFailure: Story = {
  beforeEach: () => {
    injectFault('resources.list');
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const title = await canvas.findByText("We couldn't load resources");
    const alert = title.closest<HTMLElement>('[role="alert"]');
    await expect(alert).not.toBeNull();
    if (!alert) return;
    await userEvent.click(
      within(alert).getByRole('button', { name: 'Try again' }),
    );
    await expect(await itemNames(canvasElement)).toHaveLength(3);
  },
};

/** Create → invalidation → toast, all through the real data layer. */
export const CreateFlow: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await itemNames(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'New resource' }));
    const dialog = await screen.findByRole('dialog', { name: 'New resource' });
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Name' }),
      'Delta resource',
    );
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Quantity' }),
      '3',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await expect(await screen.findByText('Resource created')).toBeVisible();
    await waitFor(async () =>
      expect(await itemNames(canvasElement)).toContain('Delta resource'),
    );
    await expect(
      canvas.getByRole('button', { name: 'New resource' }),
    ).toHaveFocus();
  },
};

export const Portuguese: Story = {
  globals: { locale: 'pt-BR' },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('list', { name: 'Recursos' }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Novo recurso' }),
    ).toBeInTheDocument();
  },
};
