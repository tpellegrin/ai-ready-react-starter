// @fixture-path src/components/__arch__/reexport.ts
// @expect boundaries/dependencies: ui (src/components) must not import navigation (src/globals)
// Re-exports are dependencies too.
export { useNavigation } from 'globals/context/NavigationContext';
