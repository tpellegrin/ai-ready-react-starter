import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';

import { injectFault } from 'mocks/faults';

import { resourceFixtures } from '../../mocks';

import { ResourceForm } from './index';

/** Saves through the real HTTP client against the MSW reference API. */
const meta = {
  title: 'Features/Resources/ResourceForm',
  component: ResourceForm,
  args: { onSaved: fn(), onCancel: fn() },
} satisfies Meta<typeof ResourceForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Name' }),
      'Delta resource',
    );
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Quantity' }),
      '1500',
    );
    await expect(canvas.getByRole('textbox', { name: 'Quantity' })).toHaveValue(
      '1,500',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(args.onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Delta resource', quantity: 1500 }),
      ),
    );
  },
};

/** Client validation: errors are linked to fields; the first is focused. */
export const ClientValidation: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await waitFor(() => expect(name).toHaveFocus());
    await expect(name).toHaveAccessibleDescription(
      'Up to 60 characters. Must be unique. This field is required.',
    );
    await expect(args.onSaved).not.toHaveBeenCalled();
  },
};

/** Server validation (422): the field error comes from the API response. */
export const ServerValidation: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Name' }),
      'Alpha resource',
    );
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Quantity' }),
      '1',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));

    const name = canvas.getByRole('textbox', { name: 'Name' });
    await waitFor(() =>
      expect(name).toHaveAccessibleDescription(
        'Up to 60 characters. Must be unique. This is already in use.',
      ),
    );
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Please fix the highlighted fields.',
    );
    await expect(args.onSaved).not.toHaveBeenCalled();
  },
};

/** A 500 keeps the user's input and shows a form-level, recoverable error. */
export const SaveFailure: Story = {
  args: { resource: resourceFixtures[0] },
  beforeEach: () => {
    injectFault('resources.save');
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Something went wrong on our side',
    );
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Alpha resource',
    );

    // The fault is one-shot: saving again succeeds.
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(args.onSaved).toHaveBeenCalledTimes(1));
  },
};
