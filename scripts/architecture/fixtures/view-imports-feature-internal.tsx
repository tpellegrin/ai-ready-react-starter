// @fixture-path src/views/__arch__/UsesFeatureInternals.tsx
// @expect boundaries/dependencies: is internal to feature "arch-fixture-feature"
// Outside a feature, only its public entry (features/<name>) is importable.
import { SampleWidget } from 'features/arch-fixture-feature/components/SampleWidget';

export const UsesFeatureInternals = () => <SampleWidget />;
