import { styled } from 'styled-components';

import { typography } from 'styles/themes/typography';

export const _FieldRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xxs};
  width: 100%;
`;

export const _FieldLabel = styled.label`
  ${typography.bodyMdBold};

  color: ${({ theme }) => theme.colors.text.primary};
`;

export const _FieldRequiredMark = styled.span`
  margin-inline-start: ${({ theme }) => theme.spacers.xxs};
  color: ${({ theme }) => theme.colors.feedback.error.text};
`;

export const _FieldDescription = styled.p`
  ${typography.captionMd};

  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const _FieldError = styled.p`
  ${typography.captionMdBold};

  margin: 0;
  color: ${({ theme }) => theme.colors.feedback.error.text};
`;
