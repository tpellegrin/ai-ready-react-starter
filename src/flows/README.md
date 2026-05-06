# Flows Folder

This folder contains **infrastructure shared across all flows** in the app.

> For the full flow architecture documentation, see [`docs/flows.md`](../../docs/flows.md).

---

## What belongs here

| File | Purpose |
|---|---|
| `fromPaths.ts` | Path helpers: `getNextStepPath`, `getPrevStepPath`, `getStepIndex`, `parseFlowFromPath`, etc. |

These utilities read from `paths.flow` in `src/globals/paths.ts` and are consumed by `useFlowNav` and `useFlowProgressFromPaths`.

## What does NOT belong here

- Flow-specific screen components → `src/views/<routerType>/<FlowName>/`
- Flow-specific state → co-locate with the flow screens or use a small context
- Shared layout → `src/containers/Layouts/FlowLayout/`
- Navigation hooks → `src/hooks/useFlowNav/` and `src/hooks/useFlowProgress/`

## Rules

- Keep utilities generic and decoupled from any product domain.
- Do not import from specific view or feature folders here.
- Do not mix infrastructure with flow-specific logic.

## Extension

To register a new flow, add its step paths under `flowPaths` in `src/globals/paths.ts`. The helpers in `fromPaths.ts` will automatically pick them up — no changes to this folder are needed for new flows.

See [`docs/flows.md`](../../docs/flows.md) for the full guide.
