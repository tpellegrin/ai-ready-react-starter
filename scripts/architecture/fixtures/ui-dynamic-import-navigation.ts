// @fixture-path src/components/__arch__/lazy.ts
// @expect boundaries/dependencies: ui (src/components) must not import navigation (src/globals)
// Dynamic import() is checked like a static import.
export const loadNavigation = () => import('globals/context/NavigationContext');
