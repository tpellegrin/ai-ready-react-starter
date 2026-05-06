import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEventHandler,
} from 'react';

type CommonProps = {
  blurDelay?: number;
  blurOnClick?: boolean;
  disabled?: boolean;
  stopPropagation?: boolean;
  onClick?: MouseEventHandler;
  isFullWidth?: boolean;
};

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export type AnchorProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> &
  Required<Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>>;

export type Props = ButtonProps | AnchorProps;
