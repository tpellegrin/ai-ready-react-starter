import React from 'react';

import { _TextRoot } from './styles';
import { Props } from './types';

const Text: React.FC<Props> = React.memo(
  ({
    as = 'p',
    children,
    className,
    variant = 'body',
    align,
    color = 'default',
    truncate = false,
    numeric = 'default',
    fontSize = undefined,
    ...rest
  }) => {
    return (
      <_TextRoot
        as={as}
        className={className}
        $variant={variant}
        $align={align}
        $color={color}
        $truncate={truncate}
        $numeric={numeric}
        $fontSize={fontSize}
        {...rest}
      >
        {children}
      </_TextRoot>
    );
  },
);

export { Text };
