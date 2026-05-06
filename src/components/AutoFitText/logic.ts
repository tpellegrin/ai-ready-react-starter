import * as React from 'react';
import type { CSSProperties } from 'react';

import { AutoFitTextLogicProps } from './types';

const fitsWidth = (el: HTMLElement, width: number) => {
  return el.scrollWidth - 1 <= width;
};

const fitsHeight = (el: HTMLElement, height: number) => {
  return el.scrollHeight - 1 <= height;
};

export function useAutoFitText({
  children,
  measureText,
  autoFit,
  minFontSize,
  maxFontSize,
  mode,
  autoResize,
  onReady,
  measureContainerRef,
}: AutoFitTextLogicProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const measureRef = React.useRef<HTMLDivElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  const [fontSize, setFontSize] = React.useState<number | null>(null);
  const [ready, setReady] = React.useState(false);
  const [measureKey, setMeasureKey] = React.useState(0);

  React.useLayoutEffect(() => {
    if (!autoFit) return;

    const box = measureContainerRef?.current ?? containerRef.current;
    const measureEl = measureText ? measureRef.current : wrapperRef.current;

    if (!box || !measureEl) return;

    const rect = box.getBoundingClientRect();
    const styles = window.getComputedStyle(box);

    const paddingLeft = parseFloat(styles.paddingLeft || '0') || 0;
    const paddingRight = parseFloat(styles.paddingRight || '0') || 0;
    const paddingTop = parseFloat(styles.paddingTop || '0') || 0;
    const paddingBottom = parseFloat(styles.paddingBottom || '0') || 0;

    const originalWidth =
      rect.width - paddingLeft - paddingRight || window.innerWidth;
    const originalHeight = rect.height - paddingTop - paddingBottom;

    if (!originalWidth || originalWidth <= 0) return;
    if (mode === 'multi' && (!originalHeight || originalHeight <= 0)) return;

    measureEl.style.whiteSpace = mode === 'single' ? 'nowrap' : 'normal';

    let low = minFontSize;
    let high = maxFontSize;
    let mid = minFontSize;

    const testPrimary = () => {
      if (mode === 'multi') return fitsHeight(measureEl, originalHeight);
      return fitsWidth(measureEl, originalWidth);
    };

    const testSecondary = () => {
      if (mode === 'multi') return fitsWidth(measureEl, originalWidth);
      return fitsHeight(measureEl, originalHeight);
    };

    setReady(false);

    // Step 1: primary dimension (width for single, height for multi)
    while (low <= high) {
      mid = Math.floor((low + high) / 2);
      measureEl.style.fontSize = `${mid}px`;

      if (testPrimary()) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Step 2: secondary dimension only for multi-line
    if (mode === 'multi' && !testSecondary()) {
      low = minFontSize;
      high = mid;

      while (low < high) {
        mid = Math.floor((low + high) / 2);
        measureEl.style.fontSize = `${mid}px`;

        if (testSecondary()) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
    }

    // Step 3: clamp
    mid = Math.min(low, high);
    mid = Math.max(mid, minFontSize);
    mid = Math.min(mid, maxFontSize);
    mid = Math.max(mid, 0);

    // Apply final font-size to measurer
    measureEl.style.fontSize = `${mid}px`;

    // Lock visible wrapper to measured box
    const finalWidth = measureEl.scrollWidth;
    const finalHeight = measureEl.scrollHeight;

    if (wrapperRef.current) {
      wrapperRef.current.style.fontSize = `${mid}px`;

      if (finalWidth > 0) {
        wrapperRef.current.style.minWidth = `${finalWidth}px`;
      }

      if (mode === 'single' && finalHeight > 0) {
        wrapperRef.current.style.minHeight = `${finalHeight}px`;
      }
    }

    setFontSize(mid);
    setReady(true);
    onReady?.(mid);
  }, [
    autoFit,
    minFontSize,
    maxFontSize,
    mode,
    onReady,
    measureText,
    measureKey,
    measureContainerRef,
  ]);

  React.useLayoutEffect(() => {
    if (!autoFit || !autoResize) return;

    const container = containerRef.current;
    if (!container) return;
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      setFontSize(null);
      setReady(false);
      setMeasureKey((k) => k + 1);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [autoFit, autoResize]);

  const computed = fontSize ?? maxFontSize;

  // Visible child: force it to inherit the wrapper font-size
  const clonedChild = React.isValidElement(children)
    ? React.cloneElement(children, {
        style: {
          ...(children.props.style || {}),
          fontSize: 'inherit',
        },
      })
    : children;

  // Measurer: if it's an element (e.g. <Text />), also force fontSize: 'inherit'
  const clonedMeasure: React.ReactNode =
    typeof measureText === 'string' ||
    typeof measureText === 'number' ||
    measureText == null
      ? measureText
      : React.isValidElement<{ style?: CSSProperties }>(measureText)
        ? React.cloneElement(measureText, {
            style: {
              ...(measureText.props.style || {}),
              fontSize: 'inherit',
            },
          })
        : measureText;

  return {
    containerRef,
    measureRef,
    wrapperRef,
    computedFontSize: computed,
    clonedChild,
    clonedMeasure,
    ready,
  };
}
