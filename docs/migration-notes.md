# Migration notes (from `9a5e655` to the 2026-10 foundation)

For projects that started from the earlier version of this starter. Each item
says what changed and what to do. Decisions are recorded in the ADRs
referenced in brackets.

## Toolchain [0009]

- **Node 24 LTS** is required (`.nvmrc`, `engines`, `engine-strict`). pnpm is
  pinned via `packageManager` (use Corepack).
- `pnpm typecheck` is `tsc -b` over three projects (`tsconfig.app.json`,
  `tsconfig.test.json`, `tsconfig.node.json`) with
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Expect to add
  `| undefined` to optional props you pass `undefined` to, and to handle
  possibly-undefined array/record access.
- `pnpm lint` covers the whole repository with type-aware rules and zero
  warnings. Replace `void promise` with `await` or
  `runDetached(promise, onError)` (`src/utils/async`).
- New scripts: `test:cov`, `check:build`, `test:storybook`, `storybook`,
  `storybook:build`, `test:e2e`, `gen`, `gen:check`, `adopt`, `adopt:check`,
  `verify`. `validate.yml` is replaced by `ci.yml`.

## Configuration [0010]

- `VITE_API_BASE_URL` and `VITE_AUTH_PROVIDER` are **required**; booleans must
  be exactly `true`/`false`. `pnpm build` fails until `VITE_API_BASE_URL` is
  provided by the environment. See `docs/configuration.md`.
- Read configuration through `src/config` (`appConfig`, `DEMO_MODE`,
  `MOCKS_ENABLED`, `IS_DEV`, `basePath`); `import.meta.env` elsewhere and
  `process.env` in browser code are lint errors.

## Authentication [0003 amendment]

- `AuthAdapter` v2: `restoreSession(signal) → User | null`,
  `signIn(credentials) → User` (reject with `AuthError('invalid_credentials')`),
  `signOut()`, `completeOnboarding() → User`. Adapters no longer hold or
  broadcast state.
- `AuthProvider` requires an `adapter` prop; the composition root creates it
  (`src/containers/composition/createAuthAdapter.ts`). The mock adapter is now
  the demo adapter in `src/demo/auth` (demo builds only); the reference real
  adapter is `src/auth/adapters/session.ts`.
- `useAuth()` exposes `status` (`initializing | authenticated |
unauthenticated | error`), `user`, `error`, `isAuthenticated`,
  `isInitialized`, and async `signIn`, `signOut`, `restoreSession`,
  `completeOnboarding`.
- `RouterSwitcher`/`switchRouter` and `RequireOnboarding` are removed: the
  router group follows auth state. Finish onboarding by calling
  `completeOnboarding()`.

## Routing [0002 amendment]

- `src/containers/Router` is replaced by `src/containers/routing`
  (`routeTable`, `buildRouteObjects`, unknown-route policy).
- `RouteType` supports `lazy`. Unknown paths render Not Found (or sign-in with
  `returnTo` for protected paths) instead of redirecting to `/`.
- `RequireAuth` is a named export and waits for the session.
- `src/views/ErrorPage.tsx` moved to `src/views/system/ErrorPage`.

## Data [0011]

- Removed: `src/api/demoApi.ts`, `src/api/queryKeys.ts`,
  `src/globals/react-query.ts`. Use `apiClient.request({ path, schema,
signal })` (`src/api/client.ts`), feature-owned keys and `queryOptions`
  (`features/<name>/queries.ts`), and `createQueryClient()`
  (`src/api/queryClient.ts`).
- Responses must match a Zod schema; failures are `ApiError`s. Show them with
  `t(getErrorMessageKey(error))`.

## Forms [0012]

- `LabeledInputField` and `utils/form` are removed. Use `Field` with `Input`,
  `Select`, `Textarea`, plus `Checkbox`/`RadioGroup`, React Hook Form and
  Zod (`docs/recipes/data-and-forms.md`).
- `Input` numeric mode reports `number | null` via `onValueChange`; `value`
  accepts `null` for empty.

## Components [0014]

- Removed (unused or broken): `Carousel`, `AutoFitText`,
  `Animations/AnimatedAmount`, `Form/FileInput`, `Form/Range`,
  `LabeledInputField`, and the hooks `useDisableBodyTextSelect`,
  `useGlobalMouseEventListener`, `useGlobalTouchEventListener`,
  `useNavigation`, `usePersistScrollPosition`, `useTouchGestureNavigation`,
  `useTransitionLock`; utils `css`, `form`, `links`; `styles/themes/light.ts`.
- `Button`: `startIcon`/`endIcon` work (decorative), `isPending` +
  `pendingLabel` replace manual disabling while saving. `ButtonBase` renders a
  `<button>` only. `LinkBase` takes `to` (in-app) or `href` and no longer
  rewrites relative URLs.
- `Text`: `as` accepts text elements only; without `variant`/`color` it
  inherits (the old defaults `body`/`default` were not valid tokens and had
  no effect).
- `Progress` requires `label`. `LanguageSelector` moved to
  `components/LanguageSelector/`. `Control` renders a `div` root.
- New: `Field`, `Checkbox`, `RadioGroup`, `Dialog`, `ConfirmDialog`,
  `Toast` (`useToast`), `InlineAlert`, `LoadingState`, `Skeleton`,
  `EmptyState`, `ErrorState`, `Spinner`.
- Route transition components moved from `src/components/CenterOnlyTransition`
  (and `AnimatedOutlet`) to `src/containers/RouteTransitions/`;
  `OverlayRoleContext` moved to `src/utils/transitions/overlayRole.ts`.

## Styles and i18n [0005, 0007 amendments]

- `styled-normalize` → `modern-normalize`. `src/styles/colors.ts` and
  `src/i18n/numberFormat.ts` are the new homes of color and number helpers.
- `I18nProvider` accepts `initialLocale`; a pseudo-locale is generated by
  `pnpm i18n:pseudo` and must stay current.

## Structure [0013]

- Product code goes in `src/features/<name>` and is imported through its
  `index.ts`. Import rules are enforced (`docs/architecture/boundaries.md`);
  move code that violates them rather than suppressing the rule.

## Tests [0015]

- Use `renderWithProviders` / `renderApp` (`src/test`), `createFakeAuthAdapter`
  (`src/test/auth.ts`) and MSW handlers; a request without a handler fails the
  test. Storybook and Playwright suites run in CI.
