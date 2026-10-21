// @fixture-path src/features/arch-fixture-feature/__arch__/usesOwnMocks.ts
// @expect boundaries/dependencies: Mock code (MSW handlers, fixtures) is for tests, stories and the demo build only
// Production feature code must not depend on its mock data.
import { sampleFixtures } from '../mocks/fixtures';

export const firstName = sampleFixtures[0]?.name;
