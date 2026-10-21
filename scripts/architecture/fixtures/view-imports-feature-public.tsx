// @fixture-path src/views/__arch__/UsesFeaturePublicApi.tsx
// @expect none
// Route composition uses a feature through its public API.
import { SampleWidget } from 'features/arch-fixture-feature';

export const UsesFeaturePublicApi = () => <SampleWidget />;
