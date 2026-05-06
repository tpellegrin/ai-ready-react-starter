export const keysOf = <T extends object>(o: T) =>
  Object.keys(o) as (keyof typeof o)[];

export const nestedKeysOf = <T extends Record<string, unknown>>(
  o: T,
  prefix = '',
): string[] =>
  Object.keys(o).reduce((keys: string[], key: string) => {
    const value = o[key as keyof T];
    if (typeof value === 'object' && value !== null) {
      return [
        ...keys,
        ...nestedKeysOf(value as Record<string, unknown>, prefix + key + '.'),
      ];
    }

    return [...keys, prefix + key];
  }, []);
