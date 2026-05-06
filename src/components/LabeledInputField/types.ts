import type { ReactNode } from 'react';

import type { TextVariant } from 'components/Text/types';

export type Props = {
  label: ReactNode;
  value?: number | string;
  id?: string;
  action?: ReactNode;
  labelVariant?: TextVariant;
  valueVariant?: TextVariant;
  isDividerHidden?: boolean;
  isDecimalsHidden?: boolean;
  dataTestId?: string;
  onChangeValue?: (value: number | null) => void;
  format?: 'currency' | 'number';
  valueSuffix?: ReactNode;
};
