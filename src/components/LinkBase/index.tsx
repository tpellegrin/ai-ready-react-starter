import { _LinkBaseAnchor, _LinkBaseRouterLink } from './styles';
import type { Props } from './types';

export const LinkBase = ({ isFullWidth, target, rel, ...props }: Props) => {
  const safeRel = target === '_blank' ? (rel ?? 'noreferrer noopener') : rel;

  if (props.to !== undefined) {
    const { to, replace, ...rest } = props;
    return (
      <_LinkBaseRouterLink
        {...rest}
        to={to}
        replace={replace ?? false}
        target={target}
        rel={safeRel}
        $isFullWidth={isFullWidth}
      />
    );
  }

  return (
    <_LinkBaseAnchor
      {...props}
      target={target}
      rel={safeRel}
      $isFullWidth={isFullWidth}
    />
  );
};

LinkBase.displayName = 'LinkBase';

export type { Props as LinkBaseProps } from './types';
