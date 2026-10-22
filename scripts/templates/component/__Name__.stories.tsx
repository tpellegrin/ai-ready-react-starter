import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { __Name__ } from './index';

const meta = {
  title: 'Components/__Name__',
  component: __Name__,
  args: __storyArgs__,
} satisfies Meta<typeof __Name__>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every story also runs axe (violations fail `pnpm test:storybook`). */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Example content')).toBeVisible();
  },
};
