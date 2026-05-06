import React from 'react';

import { Flex } from 'components/Flex';

import { _LayoutHeaderContent, _LayoutHeaderRoot } from './styles';
import { Props } from './types';

export const LayoutHeader: React.FC<Props> = ({
  children,
  Left,
  Center,
  Right,
}) => {
  return (
    <_LayoutHeaderRoot>
      <_LayoutHeaderContent>
        <Flex direction="row" justifyContent="flex-start" gap="xs">
          {Left}
        </Flex>

        <Flex direction="row" justifyContent="center" gap="xs">
          {Center}
        </Flex>

        <Flex direction="row" justifyContent="flex-end" gap="xs">
          {Right}
        </Flex>
      </_LayoutHeaderContent>

      {children}
    </_LayoutHeaderRoot>
  );
};
