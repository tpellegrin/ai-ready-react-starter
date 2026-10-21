import { keyframes, styled } from 'styled-components';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

export const _SpinnerRoot = styled.span<{ $size: string }>`
  display: inline-block;
  flex: 0 0 auto;
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  border: 0.125rem solid currentcolor;
  border-right-color: transparent;
  border-radius: ${({ theme }) => theme.borderRadii.full};
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    border-right-color: currentcolor;
    opacity: 0.6;
    animation: none;
  }
`;
