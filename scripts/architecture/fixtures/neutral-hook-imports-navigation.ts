// @fixture-path src/hooks/useFlipLayout/__arch__/arch.ts
// @expect boundaries/dependencies: Neutral hook "useFlipLayout"
// Hooks used by shared UI must stay free of app context.
import { paths } from 'globals/paths';

export const home = paths.index;
