import { AnchorProps, ButtonProps, Props } from './types';

export function isAnchorProps(props: Partial<Props>): props is AnchorProps {
  return typeof (props as { href?: unknown }).href === 'string';
}

export function isButtonProps(props: Partial<Props>): props is ButtonProps {
  return !isAnchorProps(props);
}
