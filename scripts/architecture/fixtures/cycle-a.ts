// @fixture-path src/utils/__arch__/cycleA.ts
// @expect import/no-cycle: Dependency cycle detected
// Two modules importing each other (with cycle-b.ts) form a cycle.
import { b } from './cycleB';

export const a = () => b() + 1;
