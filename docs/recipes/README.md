# Recipes

Start here for any change. Each row names the command that scaffolds it,
the recipe, and existing code to copy. Run `pnpm validate` before you
finish (`pnpm verify` for routing, session and UI behavior).

| Task                                              | Command                                                               | Recipe                                                               | Copy from                                   |
| ------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| New product capability with data                  | `pnpm gen feature <name>`                                             | [new-feature](new-feature.md)                                        | the generated feature; `ResourceCatalog`¹   |
| New page and route                                | `pnpm gen view <Page> --group user\|guest [--feature <name>] [--nav]` | [add-route](add-route.md)                                            | `src/views/user/Dashboard`                  |
| Fetch server data; loading/empty/error/success    | (in the feature) `queries.ts` + a `logic.ts` that derives the view    | [data-and-forms](data-and-forms.md#queries)                          | generated `<Feature>Panel`                  |
| Mutate data, validated form with server errors    | `useMutation` in `queries.ts`; RHF + Zod + `Field`                    | [data-and-forms](data-and-forms.md#forms)                            | `ResourceForm`¹, `src/views/guest/SignIn`   |
| State in the URL (filters, tabs)                  | `useSearchParams` in the page's `logic.ts`                            | [routing](../routing.md#route-definitions)                           | the `Resources` page’s `logic.ts`¹          |
| Multi-step flow                                   | `pnpm gen flow <id> --group user\|guest --steps a,b,c`                | [flows](../flows.md)                                                 | `src/views/onboarding`                      |
| Shared UI building block (none fits)              | `pnpm catalog <name>` first, then `pnpm gen component <Name>`         | [ui/foundation](../ui/foundation.md#adding-a-building-block)         | `src/components/InlineAlert`                |
| Component for one feature                         | `pnpm gen component <Name> --feature <name> [--logic]`                | [ui/foundation](../ui/foundation.md#public-components-and-internals) | generated feature components                |
| Compose two features on one page                  | import both public APIs in the view                                   | [boundaries](../architecture/boundaries.md#features)                 | a view rendering two `<Feature>Panel`s      |
| Copy and translations                             | add keys to every `src/i18n/locales/*.json`; `pnpm i18n:pseudo`       | `src/i18n/README.md`                                                 | any `t('…')` call                           |
| Real authentication / session handling            | an `AuthAdapter`                                                      | [real-auth-adapter](real-auth-adapter.md)                            | `src/auth/adapters/session.ts`              |
| Session failures (401, timeouts, sign-out errors) | —                                                                     | [session-lifecycle](../session-lifecycle.md)                         | `src/containers/session/SessionMonitor.tsx` |
| Configuration variable                            | —                                                                     | [configuration](../configuration.md#adding-a-variable)               | `VITE_APP_NAME`                             |
| Remove the starter's demo/reference code          | `pnpm adopt --remove-demo [--remove-reference]`                       | [adoption](../adoption.md)                                           | —                                           |

¹ Reference feature: present in the starter, removed by
`pnpm adopt --remove-reference`. Once it is gone, the generated code is the
example.

## Generators

`pnpm gen <kind> --dry-run` prints the plan after the same checks a real
run makes. Generators validate names, paths and collisions before writing,
never overwrite files, and only add copy: an existing translation is never
replaced, turned into a group or turned from a group into a text (the
refusal names the locale and key). They format what they write. They register code at `starter:gen` markers in
the existing registries:

| Marker                                      | File                                             | Used by                              |
| ------------------------------------------- | ------------------------------------------------ | ------------------------------------ |
| `starter:gen guest-paths`, `user-paths`     | `src/globals/paths.ts`                           | `gen view`                           |
| `starter:gen flow-paths`                    | `src/globals/paths.ts`                           | `gen flow`                           |
| `starter:gen route-imports`, `routes`       | `src/views/<group>/index.tsx`                    | `gen view`, `gen flow`               |
| `starter:gen user-nav`                      | `src/views/user/common/UserPageLayout/index.tsx` | `gen view --nav` (optional)          |
| `starter:gen mock-imports`, `mock-handlers` | `src/mocks/handlers.ts`                          | `gen feature` (optional)             |
| `starter:gen exports`                       | `src/features/<name>/index.ts`                   | `gen component --feature` (optional) |

Keep the markers when you edit those files. If you replace a file and drop
an optional marker, the generator reports that step as manual instead of
failing; a missing required marker stops it with nothing written.

## Finding existing building blocks

`pnpm catalog` lists the public components, layouts and feature APIs with
their import paths and props; `pnpm catalog <name|prop>` shows one in detail
(exports, props with types and docs, stories, tests, files that use it).
It reports facts from the source; when to use what is in
[ui/foundation](../ui/foundation.md#inventory).

## Writing a task for an agent

Copy [task-template](../task-template.md).
