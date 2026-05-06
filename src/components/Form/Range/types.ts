import type { InputHTMLAttributes, ReactNode } from 'react';

export type RangeType = 'money' | 'percentage' | 'raw';
export type RangeVariant = 'flat' | 'low-high' | 'good-bad';

type ControlAttributesToOmit =
  | 'value'
  | 'min'
  | 'max'
  | 'step'
  | 'onChange'
  | 'defaultValue';

export type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  ControlAttributesToOmit
> & {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
  type?: RangeType;
  variant?: RangeVariant;
  locale?: string;
  currency?: string;
  id?: string;
  disabled?: boolean;
  readOnly?: boolean;
  isLoading?: boolean;
  controlSize?: 'small' | 'medium';
  status?: 'default' | 'error' | 'success' | 'loading';
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
};

export type LogicProps = Required<
  Pick<Props, 'value' | 'min' | 'max' | 'step'>
> &
  Pick<Props, 'onValueChange' | 'onValueCommit'> & {
    isRtl: boolean;
  };
