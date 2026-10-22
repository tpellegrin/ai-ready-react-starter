// @fixture-path src/components/__arch__/Panel/index.ts
// @expect starter/no-internal-styled-imports: "_PanelRoot" is internal to Panel
// A `_` element is never public, not even from its own index: give a shared
// building block a public name instead.
export { _PanelRoot } from './styles';
