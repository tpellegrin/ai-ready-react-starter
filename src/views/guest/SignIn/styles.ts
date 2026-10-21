import { styled } from 'styled-components';

export const _SignInRoot = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacers.md};
  min-height: 100%;
  padding: ${({ theme }) => theme.spacers.lg} ${({ theme }) => theme.spacers.md};
`;

export const _SignInForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
  max-width: 20rem;
`;
