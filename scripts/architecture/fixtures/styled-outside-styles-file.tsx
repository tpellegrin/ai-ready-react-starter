// @fixture-path src/views/__arch__/Inline.tsx
// @expect no-restricted-imports: Define styled elements in the component's styles.ts
import { styled } from 'styled-components';

const Box = styled.div``;
export const Inline = () => <Box />;
