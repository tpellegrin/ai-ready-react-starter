import React from 'react';

import { _TextRoot } from './styles';
import { type Props } from './types';

const Text: React.FC<Props> = React.memo(
  ({
    as = 'p',
    children,
    className,
    // No variant/color: inherit typography and color from the context
    // (e.g. a Button label or an InlineAlert tone).
    variant,
    align,
    color,
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
