// @fixture-path src/utils/__arch__/usesUi.ts
// @expect boundaries/dependencies: utils (src/utils) must not import ui (src/components/Button)
// utils is the bottom layer.
export { Button } from 'components/Button';
