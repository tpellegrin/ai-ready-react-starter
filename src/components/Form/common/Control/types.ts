import type {
  CSSProperties,
  InputHTMLAttributes,
  MouseEventHandler,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import type {
  _ControlAdornment,
  _ControlSuffix,
  ControlSize,
  ControlStatus,
} from './styles';

export type ControlContextValue = {
  size: ControlSize;
  disabled: boolean;
  status: ControlStatus;
};

/** Visual chrome (border, background, adornments) around a native field. */
export type ControlProps = {
  size?: ControlSize | undefined;
  status?: ControlStatus | undefined;
  disabled?: boolean | undefined;
  noBorder?: boolean | undefined;
  alignStart?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  onClick?: MouseEventHandler<HTMLDivElement> | undefined;
  'data-testid'?: string | undefined;
};

export type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  as?: 'input' | undefined;
  ref?: Ref<HTMLInputElement> | undefined;
};

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  as: 'select';
  ref?: Ref<HTMLSelectElement> | undefined;
};

export type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  as: 'textarea';
  ref?: Ref<HTMLTextAreaElement> | undefined;
};

export type ControlFieldProps =
  | InputFieldProps
  | SelectFieldProps
  | TextareaFieldProps;

export type ControlCompound = ((props: ControlProps) => ReactNode) & {
  Field: (props: ControlFieldProps) => ReactNode;
  Adornment: typeof _ControlAdornment;
  Suffix: typeof _ControlSuffix;
  displayName?: string;
};
