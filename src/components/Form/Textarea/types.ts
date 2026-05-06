import type { ControlSize, ControlStatus } from '../common/Control/styles';

export type TextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    /** Visual size of the control. Defaults to 'medium'. */
    controlSize?: ControlSize;
    /** Visual status of the control. Defaults to 'default'. */
    status?: ControlStatus;
    /** Optional leading adornment (icon, etc.). Non-interactive by default. */
    startAdornment?: React.ReactNode;
    /** Optional trailing adornment (icon, buttons). Wrap interactive elements to re-enable pointer events. */
    endAdornment?: React.ReactNode;
    /** Sets data-testid on the root Control container. */
    dataTestId?: string;
  };
