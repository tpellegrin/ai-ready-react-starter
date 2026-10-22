// @fixture-path src/views/__arch__/Banner.tsx
// @expect no-restricted-syntax: Inline transitions bypass the motion system
// @expect no-restricted-syntax: Raw color value: use a theme token
// @expect no-restricted-syntax: Raw color value: use a theme token
export const Banner = () => (
  <p style={{ transition: 'opacity 1s', color: '#ff0000' }}>
    <span style={{ borderColor: 'rgba(0, 0, 0, 0.5)' }}>!</span>
  </p>
);
