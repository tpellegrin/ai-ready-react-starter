import type { AnchorHTMLAttributes, ReactNode, Ref } from 'react';
import type { To } from 'react-router-dom';

type CommonProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'children'
> & {
  ref?: Ref<HTMLAnchorElement> | undefined;
  children: ReactNode;
  isFullWidth?: boolean | undefined;
};

/**
 * Unstyled link. Links navigate; use ButtonBase/Button for actions.
 * - `to`: in-app route (React Router link, works with hash routing).
 * - `href`: document or external URL, passed through unchanged.
 * `target="_blank"` gets `rel="noreferrer noopener"` unless rel is given.
 */
export type Props = CommonProps &
  (
    | { to: To; replace?: boolean | undefined; href?: never }
    | { href: string; to?: never; replace?: never }
  );
