import React from 'react';

import { Flex } from 'components/Flex';
import { Text } from 'components/Text';
import { Input } from 'components/Form/Input';

import type { Props } from './types';
import { Divider } from './styles';

export const LabeledInputField: React.FC<Props> = ({
  label,
  value,
  id,
  action,
  isDividerHidden = false,
  isDecimalsHidden = false,
  labelVariant = 'bodyMd',
  valueVariant = 'bodyMdBold',
  onChangeValue,
  format = 'currency',
  valueSuffix,
  dataTestId,
}) => {
  const labelId = id ? `${id}-lbl` : undefined;

  const handleValueChange = (v: number | null) => {
    if (!onChangeValue) return; // read-only usage
    if (v === null) return onChangeValue(null);
    const nonNegative = v < 0 ? 0 : v;
    const coerced = isDecimalsHidden ? Math.trunc(nonNegative) : nonNegative;
    onChangeValue(coerced);
  };

  return (
    <Flex
      direction="row"
      justifyContent="space-between"
      alignItems="baseline"
      gap="xs"
    >
      <Flex direction="row" gap="xxs" width="fit-content">
        <Text id={labelId} as="span" variant={labelVariant} truncate>
          {label}
        </Text>
        {action}
      </Flex>

      {!isDividerHidden && <Divider />}

      <Flex direction="row" gap="xxs" width="fit-content">
        {typeof value === 'string' ? (
          <Text as="span" variant={valueVariant} numeric="tabular">
            {value}
          </Text>
        ) : (
          <Input
            id={id}
            aria-labelledby={labelId}
            format={format}
            inputMode={isDecimalsHidden ? 'numeric' : 'decimal'}
            placeholderNumber={0}
            value={value}
            maximumFractionDigits={isDecimalsHidden ? 0 : undefined}
            onValueChange={handleValueChange}
            valueSuffix={valueSuffix}
            dataTestId={dataTestId}
          />
        )}
      </Flex>
    </Flex>
  );
};
