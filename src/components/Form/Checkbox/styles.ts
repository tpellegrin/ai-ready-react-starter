import { styled } from 'styled-components';

import { focusRing } from 'styles/mixins';
import { typography } from 'styles/themes/typography';

export const _CheckboxRoot = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacers.xs};
`;

export const _CheckboxInput = styled.input`
  flex: 0 0 auto;
  width: ${({ theme }) => theme.spacers.md};
  height: ${({ theme }) => theme.spacers.md};
  margin: ${({ theme }) => theme.spacers.xxxs} 0 0;
  accent-color: ${({ theme }) => theme.colors.action.primary};
  cursor: pointer;

  &:focus-visible {
    ${focusRing};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

export const _CheckboxText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xxxs};
`;

export const _CheckboxLabel = styled.label`
  ${typography.bodyMd};

  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

export const _CheckboxHint = styled.p<{ $isError?: boolean | undefined }>`
  ${typography.captionMd};

  margin: 0;
  color: ${({ theme, $isError }) =>
    $isError ? theme.colors.feedback.error.text : theme.colors.text.secondary};
`;
