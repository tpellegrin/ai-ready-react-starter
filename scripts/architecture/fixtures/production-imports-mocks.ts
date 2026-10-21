// @fixture-path src/components/__arch__/usesMocks.ts
// @expect boundaries/dependencies: Mock code (MSW handlers, fixtures) is for tests, stories and the demo build only
import { handlers } from 'mocks/handlers';

export const count = handlers.length;
