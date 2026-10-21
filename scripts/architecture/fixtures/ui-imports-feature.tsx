// @fixture-path src/components/__arch__/UsesFeature.tsx
// @expect boundaries/dependencies: is shared infrastructure and must not depend on product feature "arch-fixture-feature"
// Shared UI stays domain-neutral.
import { SampleWidget } from 'features/arch-fixture-feature';

export const UsesFeature = () => <SampleWidget />;
