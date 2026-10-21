import { styled } from 'styled-components';

import { focusRing } from 'styles/mixins';
import { typography } from 'styles/themes/typography';

export const _RadioGroupRoot = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xs};
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
`;

export const _RadioGroupLegend = styled.legend`
  ${typography.bodyMdBold};

  margin-bottom: ${({ theme }) => theme.spacers.xxs};
  padding: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const _RadioGroupOption = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacers.xs};
`;

export const _RadioGroupOptionText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xxxs};
`;

export const _RadioGroupOptionLabel = styled.label`
  ${typography.bodyMd};

  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

export const _RadioGroupInput = styled.input`
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

export const _RadioGroupHint = styled.p<{ $isError?: boolean | undefined }>`
  ${typography.captionMd};

  margin: 0;
  color: ${({ theme, $isError }) =>
    $isError ? theme.colors.feedback.error.text : theme.colors.text.secondary};
`;

export const _RadioGroupRequiredMark = styled.span`
  margin-inline-start: ${({ theme }) => theme.spacers.xxs};
  color: ${({ theme }) => theme.colors.feedback.error.text};
`;
