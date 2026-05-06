# Authentication Folder

## Purpose
This folder owns the authentication boundary of the application. It abstracts the authentication logic, allowing the rest of the app to interact with user sessions without knowing the underlying implementation.

## Rules
- **Use `useAuth`**: All components and hooks should interact with authentication via the `useAuth` hook.
- **Stable Interface**: The `AuthAdapter` interface in `types.ts` must remain stable.
- **Replaceable Adapters**: Real authentication providers (Auth0, Firebase, etc.) should be implemented as `AuthAdapter` and injected in `AuthProvider.tsx`.

## Avoid
- **Direct Storage Access**: Do not read or write tokens directly to `localStorage` or cookies outside of an adapter.
- **Domain-Specific Logic**: Avoid adding product-specific roles or permissions logic here unless it's truly global.

## Extension guidance
To add a new authentication method, create a new adapter file (e.g., `realAdapter.ts`) that implements the `AuthAdapter` interface, and update `AuthProvider.tsx` to use it.
