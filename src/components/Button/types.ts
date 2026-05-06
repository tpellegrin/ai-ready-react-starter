import type { Props as ButtonBaseProps } from 'components/ButtonBase/types';

export type ButtonSize = 'small' | 'smallTight' | 'medium';
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'accent';

export type Props = ButtonBaseProps & {
  size?: ButtonSize;
  variant?: ButtonVariant;
  isCompact?: boolean;
  startIconName?: string;
  endIconName?: string;
  label: string;
};
