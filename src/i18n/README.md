# Internationalization (i18n) Folder

## Purpose

This folder manages the application's multi-language support.

## Rules

- **Externalize Text**: No user-facing strings should be hardcoded in the codebase.
- **Sync Locales**: Ensure that all supported languages have keys for every translation.
- **Run Checks**: Use `pnpm i18n:check` to verify consistency.

## Avoid

- **Hardcoding**: Avoid using literal strings for labels, messages, or placeholders in JSX.
- **Inline Translations**: Do not create local translation objects; use the central locales.

## Extension guidance

To add a new translation, add the key-value pair to all JSON files in `src/i18n/locales/`. Use the `useI18n` hook to access the translations in your components.
