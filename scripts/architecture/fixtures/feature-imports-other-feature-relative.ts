// @fixture-path src/features/__arch__/relativeCross.ts
// @expect boundaries/dependencies: never from another feature
// A relative path into another feature is still a cross-feature import.
export { sampleLabel } from '../arch-fixture-feature/model';
