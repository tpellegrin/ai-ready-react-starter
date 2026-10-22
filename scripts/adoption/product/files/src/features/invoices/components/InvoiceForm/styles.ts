import { styled } from 'styled-components';

/** Internal: named _<Component><Part>, theme tokens only. */
export const _InvoiceFormRoot = styled.form`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
`;

export const _InvoiceFormFields = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
`;
