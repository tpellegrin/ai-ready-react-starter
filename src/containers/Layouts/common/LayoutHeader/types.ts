import { type PropsWithChildren } from 'react';
import type React from 'react';

export type Props = PropsWithChildren<{
  Left?: React.ReactNode | undefined;
  Center?: React.ReactNode | undefined;
  Right?: React.ReactNode | undefined;
  progress?: number | undefined;
}>;
