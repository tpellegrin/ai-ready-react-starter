// @fixture-path src/utils/__arch__/cycleB.ts
// @expect import/no-cycle: Dependency cycle detected
import { a } from './cycleA';

export const b = (): number => (Math.random() > 2 ? a() : 0);
