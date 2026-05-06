import React, { createContext, forwardRef, useContext, useMemo } from 'react';

import {
  _ControlRoot,
  _ControlContent,
  _ControlBackground,
  _ControlField,
  _ControlAdornment,
  _ControlSuffix,
  type ControlSize,
} from './styles';
import {
  ControlFieldAs,
  ControlFieldComponent,
  ControlFieldProps,
  ControlProps,
  InputFieldProps,
  SelectFieldProps,
  TextareaFieldProps,
  ControlCompound,
  ControlContextValue,
} from './types';

const _ControlContext = createContext<ControlContextValue | null>(null);

const _ControlFieldImpl = React.memo(
  forwardRef<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    ControlFieldProps
  >((props, ref) => {
    const as = (props.as ?? 'input') as ControlFieldAs;
    const multiline = as === 'textarea';
    const ctx = useContext(_ControlContext);
    const size: ControlSize = ctx?.size ?? 'medium';
    const disabledFromCtx = ctx?.disabled ?? false;
    const ariaInvalidFromCtx: true | undefined =
      ctx?.status === 'error' ? true : undefined;

    if (as === 'select') {
      const p = props as SelectFieldProps;
      const mergedDisabled = disabledFromCtx || !!p.disabled;
      const mergedAriaInvalid =
        (p['aria-invalid'] as true | undefined) ?? ariaInvalidFromCtx;
      return (
        <_ControlField
          {...p}
          as={as}
          ref={ref as React.Ref<HTMLSelectElement>}
          $size={size}
          $multiline={false}
          disabled={mergedDisabled}
          aria-invalid={mergedAriaInvalid}
        />
      );
    }

    if (as === 'textarea') {
      const p = props as TextareaFieldProps;
      const mergedDisabled = disabledFromCtx || !!p.disabled;
      const mergedAriaInvalid =
        (p['aria-invalid'] as true | undefined) ?? ariaInvalidFromCtx;
      return (
        <_ControlField
          {...p}
          as={as}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          $size={size}
          $multiline={multiline}
          disabled={mergedDisabled}
          aria-invalid={mergedAriaInvalid}
        />
      );
    }

    const p = props as InputFieldProps;
    const mergedDisabled = disabledFromCtx || !!p.disabled;
    const mergedAriaInvalid =
      (p['aria-invalid'] as true | undefined) ?? ariaInvalidFromCtx;
    return (
      <_ControlField
        {...p}
        as={as}
        ref={ref as React.Ref<HTMLInputElement>}
        $size={size}
        $multiline={false}
        disabled={mergedDisabled}
        aria-invalid={mergedAriaInvalid}
      />
    );
  }),
);

const Control = ({
  size = 'medium',
  status = 'default',
  disabled = false,
  noBorder,
  as = 'label',
  alignStart,
  children,
  className,
  ...rest
}: ControlProps) => {
  const ctx = useMemo(
    () => ({ size, disabled, status }),
    [size, disabled, status],
  );

  return (
    <_ControlRoot
      as={as}
      $size={size}
      $status={status}
      $isDisabled={disabled}
      $noBorder={noBorder}
      aria-disabled={disabled || undefined}
      aria-busy={status === 'loading' || undefined}
      className={className}
      {...rest}
    >
      <_ControlContext.Provider value={ctx}>
        <_ControlContent $alignStart={alignStart}>
          {children}
          <_ControlBackground $disabled={disabled} $noBorder={noBorder} />
        </_ControlContent>
      </_ControlContext.Provider>
    </_ControlRoot>
  );
};

const Compound = Object.assign(Control, {
  Field: _ControlFieldImpl as ControlFieldComponent,
  Adornment: _ControlAdornment,
  Suffix: _ControlSuffix,
}) as ControlCompound;

_ControlFieldImpl.displayName = 'Control.Field';
Control.displayName = 'Control';

export { Compound as Control };
