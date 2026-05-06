import { Theme } from './types';

declare module 'styled-components' {
  // noinspection JSUnusedGlobalSymbols
  export interface DefaultTheme extends Theme {}
}

export type { Theme } from './types';
