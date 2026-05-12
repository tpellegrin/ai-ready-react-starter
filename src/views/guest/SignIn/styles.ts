import styled from 'styled-components';

export const _SignInForm = styled.form`
  width: 100%;
  max-width: 20rem;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
`;
