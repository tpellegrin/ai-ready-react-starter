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
credentials, the session's CSRF token on unsafe methods, and a 15 s timeout
(`timeoutMs` per request for slow endpoints such as uploads); it handles
empty bodies (`emptyResponse`) and normalizes failures into `ApiError`
(`network`, `timeout`, `aborted`, `http`, `parse`, `schema`).
`getErrorMessageKey(error)` maps any error to an i18n key for display.

No `fetch` or other HTTP library elsewhere (lint-enforced): if you need a
different kind of request, extend `src/api/http` deliberately.

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
- Queries retry only retryable failures (network, 5xx, 408/429), at most
  twice; timeouts and mutations are never retried automatically.
- A 401 while signed in triggers a session check, not a logout; 403 and
  other errors stay in the region ([session lifecycle](../session-lifecycle.md#failure-policy)).

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

Minimal example: `src/views/guest/SignIn/logic.ts`.

<!-- starter:reference-start -->

Complete example: `ResourceForm/logic.ts` in the reference feature (create
and edit, server field errors, numeric input).

<!-- starter:reference-end -->

## Tests

Integration tests render through the real HTTP client against MSW
(`src/mocks/handlers.ts`). Mocks that keep mutable data (an in-memory store
behind mutations) reset it in `resetMockData`, which runs after each test.
Override a response with `server.use(http.get(...))`, or make the next call
of a mock fail with `injectFault('<feature>.<action>')`; any unhandled
request fails the test. The generated `<Feature>Panel.test.tsx` shows the loading, empty
and retry paths; cover a mutation's success, 422 and failure the same way.
