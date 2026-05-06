# Mobile Support with Capacitor

This boilerplate includes `@capacitor/core` for basic platform detection and readiness for mobile wrapping.

## Status: Optional & Not Initialized

Capacitor is included but not fully initialized. To use it:

1. Install the Capacitor CLI:
   ```bash
   pnpm add -D @capacitor/cli
   ```
2. Initialize Capacitor (if not already done):
   ```bash
   npx cap init
   ```
3. Add platforms:
   ```bash
   npx cap add ios
   ```
   ```bash
   npx cap add android
   ```

## Platform Detection

Use `src/globals/platforms.ts` to detect if the app is running on a mobile device or within a Capacitor webview.

## Removing Capacitor

If you don't intend to support mobile platforms:
1. Uninstall `@capacitor/core`:
   ```bash
   pnpm remove @capacitor/core
   ```
2. Delete `capacitor.config.ts`.
3. Update `src/globals/platforms.ts` to remove dependencies on Capacitor.
