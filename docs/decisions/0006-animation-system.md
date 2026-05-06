# 0006 — Unified Animation System

## Status
Accepted

## Decision
The application uses a unified animation architecture for route transitions and element reveals, based on `react-transition-group` and custom CSS transitions.

## Why
A unified system ensures that transitions feel consistent across the application. Using `AnimatedOutlet` and `CenterTransitionShell` provides standard transition patterns (fade, slide) without duplicating logic in every view.

## Consequences
- Route transitions are governed by the router configuration.
- Reveal animations should use provided helpers in `src/components/Animations/`.
- Maintain FLIP principles for layout changes where possible.

## Change guidance
To add a new animation pattern, create a helper in `src/components/Animations/` or a new shell in `src/containers/Layouts/Shells/`.
