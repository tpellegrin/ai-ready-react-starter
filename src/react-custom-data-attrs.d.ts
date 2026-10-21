import 'react';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    'data-allow-motion'?: boolean | undefined;
    'data-allow-size'?: boolean | undefined;
    'data-allow-width'?: boolean | undefined;
    'data-allow-fade'?: boolean | undefined;
  }
}
