# 0004 — React Query and API Layer

## Status
Accepted

## Decision
The project uses TanStack Query (React Query) for all server-state management. API interaction is centralized in an API layer.

## Why
React Query handles caching, synchronization, and server state updates out of the box, significantly reducing the amount of boilerplate code needed for data fetching. Centralizing API calls ensures consistency and reusability.

## Consequences
- Do not use `useEffect` for data fetching.
- All server data should be accessed via `useQuery` or `useMutation`.
- API functions must be defined outside of components (e.g., in `src/api/`).

## Change guidance
Add new API functions to `src/api/` and consume them in views using React Query hooks. Configure global defaults in `src/globals/react-query.ts`.
