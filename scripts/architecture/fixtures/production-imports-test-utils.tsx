// @fixture-path src/views/__arch__/UsesTestUtils.tsx
// @expect boundaries/dependencies: Production code must not import tests, stories or test utilities
import { renderWithProviders } from 'test/utils';

export const helper = renderWithProviders;
