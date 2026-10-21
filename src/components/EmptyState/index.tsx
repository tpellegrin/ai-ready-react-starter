import type { ReactNode } from 'react';

import { Text } from 'components/Text';

import { _EmptyStateRoot } from './styles';

type Props = {
  title: string;
  description?: string | undefined;
  /** Primary next step, e.g. a "Create" button. */
  action?: ReactNode;
  /** Heading level for the title within the page outline. */
  headingLevel?: 'h2' | 'h3' | undefined;
};

/** A successful response with nothing to show, plus the next step. */
export const EmptyState = ({
  title,
  description,
  action,
  headingLevel = 'h2',
}: Props) => (
  <_EmptyStateRoot>
    <Text as={headingLevel} variant="headingSm">
      {title}
    </Text>
    {description ? <Text color="secondary">{description}</Text> : null}
    {action}
  </_EmptyStateRoot>
);
