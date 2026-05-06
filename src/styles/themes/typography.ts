import { css } from 'styled-components';

export const typography = {
  headingXl: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.medium};
    font-size: 2.5rem;
    line-height: 1.2;
    letter-spacing: -0.02em;
  `,
  headingLg: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.semiBold};
    font-size: 2rem;
    line-height: 1.2;
    letter-spacing: -0.02em;
  `,
  headingMd: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.semiBold};
    font-size: 1.5rem;
    line-height: 1.2;
    letter-spacing: -0.01em;
  `,
  headingSm: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.semiBold};
    font-size: 1.25rem;
    line-height: 1.3;
    letter-spacing: -0.01em;
  `,
  headingXsBold: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.semiBold};
    font-size: 1.125rem;
    line-height: 1.4;
    letter-spacing: -0.01em;
  `,
  headingXs: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.regular};
    font-size: 1.125rem;
    line-height: 1.4;
    letter-spacing: -0.01em;
  `,
  accentXl: css`
    font-family: ${({ theme }) => theme.fontFamilies.accent};
    font-weight: ${({ theme }) => theme.fontWeights.accent.regular};
    font-size: 4rem;
    line-height: 1.2;
    letter-spacing: -0.01em;
  `,
  accentLg: css`
    font-family: ${({ theme }) => theme.fontFamilies.accent};
    font-weight: ${({ theme }) => theme.fontWeights.accent.regular};
    font-size: 2rem;
    line-height: 1.2;
    letter-spacing: -0.01em;
  `,
  accentMd: css`
    font-family: ${({ theme }) => theme.fontFamilies.accent};
    font-weight: ${({ theme }) => theme.fontWeights.accent.regular};
    font-size: 1.5rem;
    line-height: 1.2;
  `,
  accentSm: css`
    font-family: ${({ theme }) => theme.fontFamilies.accent};
    font-weight: ${({ theme }) => theme.fontWeights.accent.regular};
    font-size: 1.25rem;
    line-height: 1.2;
  `,
  accentXxs: css`
    font-family: ${({ theme }) => theme.fontFamilies.accent};
    font-weight: ${({ theme }) => theme.fontWeights.accent.regular};
    font-size: 0.8125rem;
    line-height: 1.2;
  `,
  bodyMd: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.regular};
    font-size: 0.875rem;
    line-height: 1.4;
  `,
  bodyMdBold: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.semiBold};
    font-size: 0.875rem;
    line-height: 1.4;
  `,
  captionMd: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.regular};
    font-size: 0.75rem;
    line-height: 1.4;
  `,
  captionMdBold: css`
    font-family: ${({ theme }) => theme.fontFamilies.primary};
    font-weight: ${({ theme }) => theme.fontWeights.primary.semiBold};
    font-size: 0.75rem;
    line-height: 1.4;
  `,
};
