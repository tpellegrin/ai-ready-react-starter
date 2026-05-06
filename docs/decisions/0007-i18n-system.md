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
