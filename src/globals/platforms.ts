import { Capacitor } from '@capacitor/core';

export const IS_PLATFORM_WEB = Capacitor.getPlatform() === 'web';

export const IS_MOBILE_DEVICE = /iPhone|iPod|Android/i.test(
  navigator.userAgent,
);

export const IS_MOBILE_WEB = IS_PLATFORM_WEB && IS_MOBILE_DEVICE;

export const IS_DESKTOP_WEB = IS_PLATFORM_WEB && !IS_MOBILE_WEB;
