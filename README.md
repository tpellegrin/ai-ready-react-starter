# React 19 + Vite + TypeScript Boilerplate

A professional, high-performance starter kit for React applications. This boilerplate is designed with a focus on architecture, performance, and developer experience.

## Features

- **React 19** with Concurrent Mode features.
- **Vite** for ultra-fast builds and HMR.
- **TypeScript** for type-safe development.
- **Styled Components** for modular, themeable styling.
- **TanStack Query (React Query)** for robust data fetching.
- **Generic Auth Adapter** for easy integration with any auth provider.
- **Unified Animation System** based on route transitions and FLIP.
- **i18n Ready** with Portuguese (BR), Spanish, and English support.
- **CI/CD Ready** with GitHub Actions.

## Getting Started

### Requirements
- Node.js 20+
- pnpm 9+ (this repo pins `pnpm@9.15.9` via the `packageManager` field)

### Installation
```bash
pnpm install
```

### Environment Setup
Copy the example environment file and adjust values:
```bash
cp .env.example .env
```

### Development
```bash
pnpm start
```
The app will be available at `http://localhost:3000`.

## Validation & Tooling

We maintain high code quality standards through automated checks. Commit messages must be single-line Conventional Commits; commit bodies and footers are disallowed.

```bash
# Run all validation checks (format, lint, typecheck, tests)
pnpm validate

# Individual checks
pnpm lint          # ESLint (Flat Config)
pnpm lint:css      # Stylelint for styled-components
pnpm typecheck     # TypeScript compiler check
pnpm test:run      # Vitest unit tests
pnpm format:check  # Prettier check
pnpm i18n:check    # i18n key consistency check
```

## Adopt this template

This boilerplate includes reusable infrastructure and a small amount of demo code (auth adapter, API, SignIn / Dashboard / onboarding views).
Before starting a real app, read **[docs/adoption.md](docs/adoption.md)**. It explains what to preserve, what to replace, and how to remove the demo auth, API, views, and onboarding flow safely.

## Architecture & Documentation

This boilerplate is designed to be **AI-ready** and maintainable. Detailed documentation is available in the `docs/` folder:

- **[Architecture Overview](docs/architecture.md)**: High-level overview of the project's systems.
- **[AI Agent Instructions](AGENTS.md)**: Critical guidance for AI coding agents.
- **[AI Change Checklist](docs/ai-change-checklist.md)**: Checklist for ensuring architectural integrity during changes.
- **[Adoption Guide](docs/adoption.md)**: How to make this boilerplate your own (replace demo auth/API/views/flows).
- **[How to Extend](docs/how-to-extend.md)**: Step-by-step guides for adding routes, views, components, etc.
- **[What Not To Do](docs/what-not-to-do.md)**: Common pitfalls and discouraged patterns.
- **[Architectural Decisions (ADRs)](docs/decisions/)**: Records of key architectural decisions and their rationale.

### Key Systems

#### Auth Adapter
The authentication layer is abstracted via `AuthAdapter`. To replace the mock implementation with a real one:
1. Implement the `AuthAdapter` interface in `src/auth/types.ts`.
2. Update `AuthProvider.tsx` to use your new adapter.
See **[src/auth/README.md](src/auth/README.md)** for details.

#### API & Data Fetching
React Query (TanStack Query) is configured in `src/globals/react-query.ts`.
API functions are centralized in `src/api/`. See the implementation in `src/api/demoApi.ts`.

#### Styling & Theming
Using `styled-components` with design tokens.
See **[src/styles/README.md](src/styles/README.md)** for guidance on using themes and tokens.

#### Routing
App-state-based routing switches between Guest, Onboarding, and User routers.
See **[src/containers/README.md](src/containers/README.md)** and **[src/views/README.md](src/views/README.md)**.

#### Animation System
Unified route and reveal animations. See **[docs/animation-system.md](docs/animation-system.md)**.

#### i18n
Multi-language support with externalized text. See **[src/i18n/README.md](src/i18n/README.md)**.

## Mobile / Capacitor (Optional)
This project includes `@capacitor/core` for potential mobile wrapper compatibility. It is **not initialized** by default.
- Documentation: [docs/mobile-capacitor.md](docs/mobile-capacitor.md)
- If you don't need mobile support, you can remove the Capacitor dependencies and `capacitor.config.ts`.

## Deployment
The project is configured for static hosting, including built-in support for GitHub Pages project sites.

```bash
pnpm build
```

The output will be in the `dist/` directory.

### GitHub Pages
To deploy to GitHub Pages:
1. Ensure the `.github/workflows/deploy-pages.yml` workflow is enabled.
2. The workflow automatically handles the repository base path (e.g., `/<repo-name>/`) by setting `GITHUB_PAGES=true` during the build.
3. For assets in the `public/` folder, always prefix paths with `import.meta.env.BASE_URL` or use absolute paths that Vite can process. Prefer importing assets from `src/` whenever possible.
