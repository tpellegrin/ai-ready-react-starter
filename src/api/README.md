# API Layer

This directory contains all API-related logic, including:
- API client functions (fetching data)
- Query keys for React Query
- Type definitions for API responses

## Directory Structure

- `demoApi.ts`: Mock API functions for demonstration purposes.
- `queryKeys.ts`: Centralized query keys to avoid magic strings.
- `README.md`: This file.

## Best Practices

- Use the centralized `queryKeys` for all queries and mutations.
- Keep API functions pure and focused on data fetching/transformation.
- Use TypeScript interfaces for all request and response data.
