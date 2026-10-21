import { keyframes, styled } from 'styled-components';

const pulse = keyframes`
  50% {
    opacity: 0.5;
  }
`;

export const _SkeletonRoot = styled.span<{ $height: string; $width: string }>`
  display: block;
  width: ${({ $width }) => $width};
  height: ${({ $height }) => $height};
  border-radius: ${({ theme }) => theme.borderRadii.sm};
  background: ${({ theme }) => theme.colors.surface.muted};
  animation: ${pulse} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
