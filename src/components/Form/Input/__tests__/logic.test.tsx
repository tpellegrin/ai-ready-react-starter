/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { I18nProvider } from 'i18n/provider';
import { useInputLogic } from '../logic';
import {
  countDigitsBefore,
  indexFromDigitCount,
  getDecimalIndex,
  countIntegerDigitsBefore,
  indexFromIntegerDigitCount,
  countFractionDigitsBefore,
  indexFromFractionDigitCount,
  clampCaretToNumericStart,
} from '../utils';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('Input Logic', () => {
  describe('Utilities', () => {
    describe('countDigitsBefore', () => {
      it('counts digits correctly', () => {
        expect(countDigitsBefore('12,345.67', 0)).toBe(0);
        expect(countDigitsBefore('12,345.67', 1)).toBe(1); // '1'
        expect(countDigitsBefore('12,345.67', 3)).toBe(2); // '12,'
        expect(countDigitsBefore('12,345.67', 6)).toBe(5); // '12,345'
        expect(countDigitsBefore('12,345.67', 9)).toBe(7); // '12,345.67'
      });
    });

    describe('indexFromDigitCount', () => {
      it('maps digits back to index correctly', () => {
        expect(indexFromDigitCount('12,345.67', 0)).toBe(0);
        expect(indexFromDigitCount('12,345.67', 1)).toBe(1); // after '1'
        expect(indexFromDigitCount('12,345.67', 2)).toBe(2); // after '2', before ','
        expect(indexFromDigitCount('12,345.67', 3)).toBe(4); // after '3'
        expect(indexFromDigitCount('12,345.67', 7)).toBe(9); // end
      });
    });

    describe('getDecimalIndex', () => {
      it('finds decimal separator index', () => {
        expect(getDecimalIndex('123.45', 'en-US')).toBe(3);
        expect(getDecimalIndex('123,45', 'pt-BR')).toBe(3);
        expect(getDecimalIndex('123', 'en-US')).toBe(-1);
      });
    });

    describe('countIntegerDigitsBefore', () => {
      it('counts integer digits correctly', () => {
        const text = '1,234.56';
        const locale = 'en-US';
        expect(countIntegerDigitsBefore(text, 0, locale)).toBe(0);
        expect(countIntegerDigitsBefore(text, 1, locale)).toBe(1); // '1'
        expect(countIntegerDigitsBefore(text, 2, locale)).toBe(1); // '1,'
        expect(countIntegerDigitsBefore(text, 5, locale)).toBe(4); // '1,234'
        expect(countIntegerDigitsBefore(text, 6, locale)).toBe(4); // '1,234.'
        expect(countIntegerDigitsBefore(text, 8, locale)).toBe(4); // past decimal
      });
    });

    describe('indexFromIntegerDigitCount', () => {
      it('maps integer digits back to index correctly', () => {
        const text = '1,234.56';
        const locale = 'en-US';
        expect(indexFromIntegerDigitCount(text, 0, locale)).toBe(0);
        expect(indexFromIntegerDigitCount(text, 1, locale)).toBe(1);
        expect(indexFromIntegerDigitCount(text, 2, locale)).toBe(3); // after '2'
        expect(indexFromIntegerDigitCount(text, 4, locale)).toBe(5); // after '4', at decimal
        expect(indexFromIntegerDigitCount(text, 5, locale)).toBe(5); // clamped to decimal
      });
    });

    describe('countFractionDigitsBefore', () => {
      it('counts fraction digits correctly', () => {
        const text = '1,234.56';
        const locale = 'en-US';
        expect(countFractionDigitsBefore(text, 0, locale)).toBe(0);
        expect(countFractionDigitsBefore(text, 5, locale)).toBe(0); // at decimal
        expect(countFractionDigitsBefore(text, 6, locale)).toBe(0); // after decimal, before '5'
        expect(countFractionDigitsBefore(text, 7, locale)).toBe(1); // after '5'
        expect(countFractionDigitsBefore(text, 8, locale)).toBe(2); // after '6'
      });
    });

    describe('indexFromFractionDigitCount', () => {
      it('maps fraction digits back to index correctly', () => {
        const text = '1,234.56';
        const locale = 'en-US';
        expect(indexFromFractionDigitCount(text, 0, locale)).toBe(6); // after decimal
        expect(indexFromFractionDigitCount(text, 1, locale)).toBe(7); // after '5'
        expect(indexFromFractionDigitCount(text, 2, locale)).toBe(8); // after '6'
        expect(indexFromFractionDigitCount(text, 3, locale)).toBe(8); // end
      });
    });

    describe('clampCaretToNumericStart', () => {
      it('clamps caret to after prefix', () => {
        expect(clampCaretToNumericStart('$ 123', 0)).toBe(2);
        expect(clampCaretToNumericStart('$ 123', 1)).toBe(2);
        expect(clampCaretToNumericStart('$ 123', 3)).toBe(3);
      });
    });
  });

  describe('useInputLogic hook', () => {
    it('returns basic field props when formatting is disabled', () => {
      const onValueChange = vi.fn();
      const onChange = vi.fn();
      const { result } = renderHook(
        () =>
          useInputLogic(
            { value: 'test', onChange, onValueChange },
            { current: null },
          ),
        { wrapper },
      );

      expect(result.current.fieldProps.value).toBe('test');
      expect(result.current.fieldProps.type).toBeUndefined(); // defaults to undefined if not provided in props

      act(() => {
        result.current.fieldProps.onChange?.({
          target: { value: 'new' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(onChange).toHaveBeenCalled();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('formats numeric values when format="number" is set', () => {
      const onValueChange = vi.fn();
      const { result } = renderHook(
        () =>
          useInputLogic(
            {
              value: 1234.56,
              format: 'number',
              maximumFractionDigits: 2,
              onValueChange,
            },
            { current: null },
          ),
        { wrapper },
      );

      // en-US default locale should format as 1,234.56
      expect(result.current.fieldProps.value).toBe('1,234.56');
    });

    it('handles currency formatting', () => {
      const { result } = renderHook(
        () =>
          useInputLogic(
            { value: 1234.56, format: 'currency', currency: 'USD' },
            { current: null },
          ),
        { wrapper },
      );

      expect(result.current.fieldProps.value).toContain('$');
      expect(result.current.fieldProps.value).toContain('1,234.56');
    });
  });
});
