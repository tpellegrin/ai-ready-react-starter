# 0007 — Internationalization (i18n) System

## Status

Accepted

## Decision

All user-facing text must be externalized using the project's i18n system.

## Why

Externalizing text ensures the application is ready for global use and simplifies copy updates. It also prevents developers from hardcoding strings that might not be easily searchable or replaceable.

## Consequences

- No hardcoded strings in JSX.
- Every new feature must include translations for all supported languages.
- Run `pnpm i18n:check` regularly.

## Change guidance

Add keys to JSON files in `src/i18n/locales/` and use the `useI18n` hook to display them.

## Amendment (2026-10)

- `t` is bound to the active language, so memoized components update on
  language change; `I18nProvider` accepts `initialLocale` (stories, tests).
- A generated pseudo-locale (`pnpm i18n:pseudo`) exposes truncation and
  hardcoded strings; `pnpm i18n:check` verifies key parity, literal keys and
  that the pseudo-locale is current.
