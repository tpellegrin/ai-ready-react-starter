import * as React from 'react';

type WritableRef<T> = { current: T | null };

/**
 * Safely assign a value to a forwarded ref (function or object).
 */
export function assignRef<T>(
  ref: React.Ref<T> | undefined,
  value: T | null,
): void {
  if (!ref) return;

  if (typeof ref === 'function') {
    ref(value);
  } else {
    const objectRef = ref as unknown as WritableRef<T>;
    objectRef.current = value;
  }
}
