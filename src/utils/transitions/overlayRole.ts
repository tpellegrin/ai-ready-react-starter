import React from 'react';

export type OverlayRole = 'active' | 'exit' | 'static';

export const OverlayRoleContext = React.createContext<OverlayRole>('static');
