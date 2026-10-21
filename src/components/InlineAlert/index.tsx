import { Text } from 'components/Text';

import { _InlineAlertActions, _InlineAlertRoot } from './styles';
import type { Props } from './types';

/**
 * Inline message for errors and outcomes that belong to a region or form.
 * Important errors stay inline (toasts are transient and easy to miss).
 */
export const InlineAlert = ({
  tone = 'info',
  title,
  children,
  actions,
  role,
  id,
}: Props) => {
  const liveRole = role ?? (tone === 'error' ? 'alert' : 'status');
  return (
    <_InlineAlertRoot
      id={id}
      $tone={tone}
      role={liveRole === 'none' ? undefined : liveRole}
    >
      {title ? (
        <Text as="p" variant="bodyMdBold">
          {title}
        </Text>
      ) : null}
      {children ? <Text as="div">{children}</Text> : null}
      {actions ? <_InlineAlertActions>{actions}</_InlineAlertActions> : null}
    </_InlineAlertRoot>
  );
};

export type { AlertTone, Props as InlineAlertProps } from './types';
