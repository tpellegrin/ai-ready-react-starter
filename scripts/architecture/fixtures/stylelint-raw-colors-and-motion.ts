// @fixture-path src/views/__arch__/Alert/styles.ts
// @lint stylelint
// @expect color-no-hex: use a theme token
// @expect color-named: use a theme token
// @expect function-disallowed-list: use a theme token
// @expect declaration-property-value-disallowed-list: Do not transition "all"
// @expect color-function-notation: Expected modern color-function notation
// @expect color-function-alias-notation: Expected "rgba" to be "rgb"
// @expect alpha-value-notation: Expected "0.5" to be "50%"
import { styled } from 'styled-components';

export const _AlertRoot = styled.div`
  color: #fff;
  border-color: red;
  background: rgba(0, 0, 0, 0.5);
  transition: all 150ms;
`;
