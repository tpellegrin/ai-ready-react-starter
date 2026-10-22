// @fixture-path src/components/ArchFixtureWidget/__arch__/logic.test.tsx
// @expect none
// A component's own tests may import its implementation files.
import { useArchFixtureWidget } from '../logic';

it('trims the label', () => {
  expect(useArchFixtureWidget(' a ').text).toBe('a');
});
