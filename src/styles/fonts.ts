import { createGlobalStyle } from 'styled-components';

import InterRegular from 'assets/fonts/Inter/Inter-Regular.ttf';
import InterMedium from 'assets/fonts/Inter/Inter-Medium.ttf';
import InterSemiBold from 'assets/fonts/Inter/Inter-SemiBold.ttf';

export const FontStyles = createGlobalStyle`
  @font-face {
      font-weight: 400;
      font-family: Inter;
      font-style: normal;
      src: url(${InterRegular});
      font-display: block;
  }
  
  @font-face {
      font-weight: 500;
      font-family: Inter;
      font-style: normal;
      src: url(${InterMedium});
      font-display: block;
  }
  
  @font-face {
      font-weight: 600;
      font-family: Inter;
      font-style: normal;
      src: url(${InterSemiBold});
      font-display: block;
  }
`;
