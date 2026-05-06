import 'react';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    'data-allow-motion'?: boolean;
    'data-allow-size'?: boolean;
    'data-allow-width'?: boolean;
    'data-allow-fade'?: boolean;
  }
}
