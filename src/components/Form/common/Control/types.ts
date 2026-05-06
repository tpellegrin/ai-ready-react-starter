import {
  _ControlAdornment,
  _ControlSuffix,
  type ControlSize,
  type ControlStatus,
} from './styles';

export type ControlContextValue = {
  size: ControlSize;
  disabled?: boolean;
  status?: ControlStatus;
};

export type ControlProps = {
  size?: ControlSize;
  status?: ControlStatus;
  disabled?: boolean;
  noBorder?: boolean;
  as?: 'label' | 'div';
  alignStart?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLElement>;
  'data-testid'?: string;
};

export type ControlFieldAs = 'input' | 'select' | 'textarea';

type ControlFieldCommon = {
  $visuallyHidden?: boolean;
};

export type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> &
  ControlFieldCommon & {
    as?: 'input';
  };

export type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> &
  ControlFieldCommon & {
    as: 'select';
  };

export type TextareaFieldProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> &
    ControlFieldCommon & {
      as: 'textarea';
    };

export type ControlFieldProps =
  | InputFieldProps
  | SelectFieldProps
  | TextareaFieldProps;

export type ControlFieldComponent = {
  (
    props: InputFieldProps & { ref?: React.Ref<HTMLInputElement> },
  ): React.ReactElement | null;
  (
    props: SelectFieldProps & { ref?: React.Ref<HTMLSelectElement> },
  ): React.ReactElement | null;
  (
    props: TextareaFieldProps & { ref?: React.Ref<HTMLTextAreaElement> },
  ): React.ReactElement | null;
};

export type ControlCompound = React.FC<ControlProps> & {
  Field: ControlFieldComponent;
  Adornment: typeof _ControlAdornment;
  Suffix: typeof _ControlSuffix;
};
