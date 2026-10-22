// @fixture-path src/views/__arch__/stylesheets.ts
// @expect no-restricted-imports: not stylesheet imports
// @expect no-restricted-imports: A parallel styling system is not used here
// @expect boundaries/no-unknown-dependencies: Dependencies to unknown elements
// Stylesheets and other styling systems bypass the theme and conventions.
import './legacy.css';
import '@emotion/react';
