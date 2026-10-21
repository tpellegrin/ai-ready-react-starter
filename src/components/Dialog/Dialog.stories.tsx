import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, screen, waitFor } from 'storybook/test';

import { Button } from 'components/Button';
import { Field } from 'components/Form/Field';
import { Input } from 'components/Form/Input';

import { Dialog } from './index';

const DialogExample = ({
  onOpenChange,
  description,
}: {
  onOpenChange: (open: boolean) => void;
  description?: string | undefined;
}) => {
  const [open, setOpen] = useState(false);
  const change = (next: boolean) => {
    setOpen(next);
    onOpenChange(next);
  };
  return (
    <>
      <Button isCompact label="Rename item" onClick={() => change(true)} />
      <Dialog
        open={open}
        onOpenChange={change}
        title="Rename item"
        description={description}
        footer={
          <>
            <Button
              isCompact
              variant="secondary"
              label="Cancel"
              onClick={() => change(false)}
            />
            <Button isCompact label="Save" onClick={() => change(false)} />
          </>
        }
      >
        <Field label="Name">{(control) => <Input {...control} />}</Field>
      </Dialog>
    </>
  );
};

const meta = {
  title: 'Components/Dialog',
  component: DialogExample,
  args: { onOpenChange: fn() },
} satisfies Meta<typeof DialogExample>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Focus moves in, Escape closes, and focus returns to the opener. */
export const Default: Story = {
  args: { description: 'Names are visible to everyone in the workspace.' },
  play: async ({ args, canvas, userEvent }) => {
    const opener = canvas.getByRole('button', { name: 'Rename item' });
    await userEvent.click(opener);

    const dialog = await screen.findByRole('dialog', { name: 'Rename item' });
    await expect(dialog).toHaveAccessibleDescription(
      'Names are visible to everyone in the workspace.',
    );
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus(),
    );

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(opener).toHaveFocus();
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
  },
};

/** Tab cycles inside the dialog while it is open. */
export const FocusTrap: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Rename item' }));
    const dialog = await screen.findByRole('dialog');
    for (let step = 0; step < 5; step += 1) {
      await userEvent.tab();
      await expect(dialog).toContainElement(
        document.activeElement as HTMLElement,
      );
    }
  },
};
