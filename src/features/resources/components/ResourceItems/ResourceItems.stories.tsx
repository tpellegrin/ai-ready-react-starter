import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { resourceFixtures } from '../../mocks';

import { ResourceItems } from './index';

const meta = {
  title: 'Features/Resources/ResourceItems',
  component: ResourceItems,
  args: { items: resourceFixtures, onEdit: fn(), onDelete: fn() },
} satisfies Meta<typeof ResourceItems>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const list = canvas.getByRole('list', { name: 'Resources' });
    await expect(list.children).toHaveLength(3);
    // Row actions name their target, so repeated "Edit" buttons are distinct.
    await userEvent.click(
      canvas.getByRole('button', { name: 'Edit Beta resource' }),
    );
    await expect(args.onEdit).toHaveBeenCalledWith(resourceFixtures[1]);
  },
};

/** Data-derived copy (status, numbers, dates) follows the active locale. */
export const Portuguese: Story = {
  globals: { locale: 'pt-BR' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Quantidade: 1\.250/)).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Editar Beta resource' }),
    ).toBeInTheDocument();
  },
};

/** Pseudo-locale: longer strings and accents reveal truncation and clipping. */
export const PseudoLocale: Story = { globals: { locale: 'pseudo' } };
