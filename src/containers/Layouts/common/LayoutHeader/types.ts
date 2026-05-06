import React, { PropsWithChildren } from 'react';

export type Props = PropsWithChildren<{
  Left?: React.ReactNode;
  Center?: React.ReactNode;
  Right?: React.ReactNode;
  progress?: number;
}>;
