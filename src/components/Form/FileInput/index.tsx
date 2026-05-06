import { forwardRef, useCallback, useEffect, useRef } from 'react';
import type { FileInputProps } from './types';

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ onSelectFiles, resetKey, ...inputProps }, ref) => {
    const innerRef = useRef<HTMLInputElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
          return;
        }
        if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const handleChange: React.ChangeEventHandler<HTMLInputElement> =
      useCallback(
        (event) => {
          const files = event.currentTarget.files
            ? Array.from(event.currentTarget.files)
            : [];
          onSelectFiles(files);
          event.currentTarget.value = '';
        },
        [onSelectFiles],
      );

    useEffect(() => {
      if (innerRef.current) {
        innerRef.current.value = '';
      }
    }, [resetKey]);

    return (
      <input
        {...inputProps}
        ref={setRefs}
        type="file"
        onChange={handleChange}
      />
    );
  },
);

FileInput.displayName = 'FileInput';
