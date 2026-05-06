import React from 'react';

import { ButtonBase } from 'components/ButtonBase';
import { Button } from 'components/Button';
import { LayoutProgress } from 'containers/Layouts/common/LayoutProgress';
import { LayoutHeader } from 'containers/Layouts/common/LayoutHeader';
import { useI18n } from 'i18n/provider';

import type { Props } from './types';

export const FlowLayoutHeader: React.FC<Props> = ({
  prevButton,
  closeButton,
  title,
  progress,
}) => {
  const { t } = useI18n();
  return (
    <LayoutHeader
      Left={
        !!prevButton && (
          <Button
            variant="tertiary"
            size="small"
            label="←"
            aria-label={t('flow.common.a11y.back')}
            {...prevButton}
            isCompact
          />
        )
      }
      Center={title ?? null}
      Right={
        !!closeButton && (
          <ButtonBase aria-label={t('flow.common.a11y.close')} {...closeButton}>
            ×
          </ButtonBase>
        )
      }
    >
      {progress !== undefined && <LayoutProgress progress={progress} />}
    </LayoutHeader>
  );
};

export type { Props as FlowLayoutHeaderProps } from './types';
