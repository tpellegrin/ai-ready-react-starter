import { screen } from '@testing-library/react';

import { Input } from 'components/Form/Input';
import { Select } from 'components/Form/Select';
import { Textarea } from 'components/Form/Textarea';
import { renderWithProviders } from 'test/utils';

import { Field } from './index';

describe('Field', () => {
  it('labels the control and links description and error', () => {
    renderWithProviders(
      <Field
        label="Name"
        description="Shown to others"
        error="Too long"
        required
      >
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveAccessibleDescription('Shown to others Too long');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('omits aria-invalid and aria-describedby when there is nothing to describe', () => {
    renderWithProviders(
      <Field label="Name">{(control) => <Input {...control} />}</Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('works with Select and Textarea and keeps ids stable and unique', () => {
    renderWithProviders(
      <>
        <Field label="Kind">
          {(control) => (
            <Select {...control} options={[{ value: 'a', label: 'A' }]} />
          )}
        </Field>
        <Field label="Notes" id="notes">
          {(control) => <Textarea {...control} />}
        </Field>
      </>,
    );
    expect(screen.getByRole('combobox', { name: 'Kind' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveAttribute(
      'id',
      'notes',
    );
  });
});
