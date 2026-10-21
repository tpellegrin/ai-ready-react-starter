# Recipe: fetch, mutate and submit forms

## Endpoint

```ts
// features/<name>/api.ts
export const fetchItems = async (filter: Filter, signal?: AbortSignal) => {
  const { items } = await apiClient.request({
    path: '/items',
    query: { status: filter === 'all' ? undefined : filter },
    schema: itemListSchema, // the response is parsed; a mismatch is an ApiError('schema')
    signal,
  });
  return items;
};
```

`apiClient` (`src/api/client.ts`) adds the base URL, JSON headers and
credentials, handles empty bodies (`emptyResponse`), and normalizes failures
into `ApiError` (`network`, `aborted`, `http`, `parse`, `schema`).
`getErrorMessageKey(error)` maps any error to an i18n key for display.

## Queries

```ts
// features/<name>/queries.ts
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filter: Filter) => [...itemKeys.lists(), filter] as const,
};
export const itemListQuery = (filter: Filter) =>
  queryOptions({
    queryKey: itemKeys.list(filter),
    queryFn: ({ signal }) => fetchItems(filter, signal),
  });
```

- Keys belong to the feature (there is no global registry); keep them
  hierarchical so one invalidation covers every filtered list.
- Pass `signal` through: queries cancel on unmount and when the session
  changes (the cache is cleared on sign-in/sign-out).
- The client retries only retryable failures (network, 5xx, 408/429), at
  most twice; mutations are never retried.

## Mutations

```ts
export const useSaveItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ItemInput) => createItem(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() }),
  });
};
```

Return the invalidation promise so the caller only reports success once the
list is fresh.

## Forms

1. Schema with error codes: `z.string().trim().min(1, 'required')`.
2. `useForm({ resolver: zodResolver(schema), defaultValues })` in the
   component's `logic.ts`.
3. Submit with `mutateAsync`; on failure call
   `applyServerFieldErrors(error, form.setError, fields)` and, if it returns
   `false`, show `t(getErrorMessageKey(error))` in an `InlineAlert`.
4. Render with `Field` and translate errors with `useFieldErrorMessage()`.

Async work started from event handlers goes through `runDetached(promise,
onError)` (`src/utils/async`), never `void promise` (lint-enforced).

Reference: `features/resources/components/ResourceForm/logic.ts`.

## Tests

Integration tests render through the real HTTP client against MSW
(`src/mocks/handlers.ts`, fixtures reset after each test). Override a
response with `server.use(http.get(...))`; any unhandled request fails the
test. See `src/views/user/Resources/Resources.test.tsx`.
