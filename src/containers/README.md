# Containers Folder

## Purpose
Containers are responsible for the composition of the application's shell, layout, and routing logic. They wire together providers and high-level components.

## Rules
- **Provider Order**: Maintain the correct order of providers in `App.tsx`.
- **Router Separation**: Preserve the guest/onboarding/user separation in `AppRouter.tsx`.
- **Global Layouts**: Keep high-level layout shells (e.g., `CenterTransitionShell`) here.

## Avoid
- **Business Logic**: Avoid putting feature-specific business logic in containers.
- **Direct Fetching**: Containers should coordinate state but rarely fetch data themselves.

## Extension guidance
To add a new global provider, wrap the tree in `App.tsx`. To add a new high-level routing category, update `AppRouter.tsx`.
