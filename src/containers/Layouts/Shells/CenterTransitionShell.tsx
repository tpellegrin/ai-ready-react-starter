import React from 'react';

import { MainLayout } from 'containers/Layouts/MainLayout';
import { CenterAnimatedOutlet } from 'components/AnimatedOutlet/CenterAnimatedOutlet';
import {
  LayoutChromeContext,
  LayoutChromeOwnerToken,
  LayoutChromePayload,
} from 'containers/Layouts/common/LayoutChromeContext';
import type {
  HeaderProp,
  FooterProp,
} from 'containers/Layouts/MainLayout/types';

type ChromeRegistryEntry = {
  payload: LayoutChromePayload;
  order: number;
};

/**
 * CenterTransitionShell
 *
 * Persistent layout shell that renders header/footer once and only animates
 * the center content using CenterAnimatedOutlet. Place this as the `element`
 * for a parent route and define all pages as its children.
 */
export function CenterTransitionShell() {
  const [headerNode, setHeaderNode] = React.useState<HeaderProp | null>(null);
  const [footerNode, setFooterNode] = React.useState<FooterProp | null>(null);

  const registryRef = React.useRef<
    Map<LayoutChromeOwnerToken, ChromeRegistryEntry>
  >(new Map());
  const orderRef = React.useRef(0);

  const resolveActiveChrome = React.useCallback(() => {
    let active: ChromeRegistryEntry | null = null;
    for (const entry of registryRef.current.values()) {
      if (!active || entry.order > active.order) {
        active = entry;
      }
    }

    setHeaderNode(active?.payload.header ?? null);
    setFooterNode(active?.payload.footer ?? null);
  }, []);

  const registerChrome = React.useCallback(
    (owner: LayoutChromeOwnerToken, payload: LayoutChromePayload) => {
      orderRef.current += 1;
      registryRef.current.set(owner, {
        payload,
        order: orderRef.current,
      });
      resolveActiveChrome();
    },
    [resolveActiveChrome],
  );

  const unregisterChrome = React.useCallback(
    (owner: LayoutChromeOwnerToken) => {
      if (!registryRef.current.has(owner)) return;
      registryRef.current.delete(owner);
      resolveActiveChrome();
    },
    [resolveActiveChrome],
  );

  return (
    <LayoutChromeContext.Provider value={{ registerChrome, unregisterChrome }}>
      <MainLayout
        header={headerNode ?? undefined}
        footer={footerNode ?? undefined}
      >
        {/* Only the outlet (center content) slides; header/footer remain static */}
        <CenterAnimatedOutlet />
      </MainLayout>
    </LayoutChromeContext.Provider>
  );
}
