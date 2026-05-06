import React from 'react';

import type {
  HeaderProp,
  FooterProp,
} from 'containers/Layouts/MainLayout/types';

export type LayoutChromeOwnerToken = symbol;

export type LayoutChromePayload = {
  header: HeaderProp | null;
  footer: FooterProp | null;
};

export type LayoutChromeContextValue = {
  registerChrome: (
    owner: LayoutChromeOwnerToken,
    payload: LayoutChromePayload,
  ) => void;
  unregisterChrome: (owner: LayoutChromeOwnerToken) => void;
};

export const LayoutChromeContext =
  React.createContext<LayoutChromeContextValue>({
    registerChrome: () => {},
    unregisterChrome: () => {},
  });
