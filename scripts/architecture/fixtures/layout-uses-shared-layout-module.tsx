// @fixture-path src/containers/Layouts/__arch__/index.tsx
// @expect none
// Loose modules of a layout group (Layouts/common/*.tsx) are shared by the
// layouts; component folders (Layouts/common/LayoutHeader) are reached
// through their index.
import { LayoutHeader } from '../common/LayoutHeader';
import { resolveHeader } from '../common/helpers';

export const header = resolveHeader(<LayoutHeader />, true);
