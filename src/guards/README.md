# Guards Folder

## Purpose
Guards are components that protect routes by checking for specific conditions, such as authentication or onboarding status.

## Rules
- **Implicit Guards**: Prefer the implicit guards provided by the state-based routing model in `AppRouter.tsx`.
- **Explicit Guards**: Use these guards only when you need to protect a specific route within a router set that doesn't fit the high-level categories.

## Avoid
- **Bypassing AppRouter**: Do not use guards to recreate the logic already handled by `AppRouter.tsx`.

## Extension guidance
To add a new guard, create a wrapper component that checks a condition and either renders the children/outlet or redirects to a safe route.
