// @fixture-path src/views/__arch__/UsesTestingLibrary.tsx
// @expect import/no-extraneous-dependencies: should be listed in the project's dependencies, not devDependencies
// Dev-only packages (testing libraries, msw, Storybook) never reach production code.
import { screen } from '@testing-library/react';

export const findTitle = () => screen.getByRole('heading');
