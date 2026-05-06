import { Theme } from 'styles/themes';
import { DotNestedKeys } from 'utils/types';

export type ColorKeys = DotNestedKeys<Theme['colors']>;

export type SpaceColorKeys<T extends keyof Theme['colors']> =
  | DotNestedKeys<Theme['colors']>
  | DotNestedKeys<Theme['colors'][T]>;

export const getSpaceColor = <T extends keyof Theme['colors']>(
  theme: Theme,
  colorPath: SpaceColorKeys<T>,
  defaultSpace: T,
): string | undefined => {
  const pathParts = (colorPath as string).split('.');
  const colors = theme.colors;

  if (pathParts.length === 1)
    return colors?.[defaultSpace]?.[
      pathParts[0] as keyof Theme['colors'][T]
    ] as string;

  let current: unknown = colors;
  while (pathParts.length) {
    const part = pathParts.shift() as string;
    if (
      current &&
      typeof current === 'object' &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      current = undefined;
      break;
    }
  }

  return typeof current === 'string'
    ? current
    : (current as string | undefined);
};
