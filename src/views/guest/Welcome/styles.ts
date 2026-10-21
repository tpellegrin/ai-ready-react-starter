import styled from 'styled-components';

export const _WelcomeRoot = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
`;

export const _WelcomeContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
  max-width: 30rem;
  padding: 0 ${({ theme }) => theme.spacers.md};
  box-sizing: border-box;
  margin: 0 auto;
`;
