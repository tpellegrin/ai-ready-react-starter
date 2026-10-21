import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type MouseEvent,
} from 'react';

import {
  _ControlRoot,
  _ControlContent,
  _ControlBackground,
  _ControlField,
  _ControlAdornment,
  _ControlSuffix,
} from './styles';
import type {
  ControlCompound,
  ControlContextValue,
  ControlFieldProps,
  ControlProps,
} from './types';

const _ControlContext = createContext<ControlContextValue | null>(null);

const INTERACTIVE = 'input, select, textarea, button, a[href], [tabindex]';

/**
 * Native field rendered inside a Control. Inherits size/disabled/error state
 * from the surrounding Control; explicit props win.
 */
const ControlField = (props: ControlFieldProps) => {
  const ctx = useContext(_ControlContext);
  const size = ctx?.size ?? 'medium';
  const disabled = (ctx?.disabled ?? false) || !!props.disabled;
  const ariaInvalid =
    props['aria-invalid'] ?? (ctx?.status === 'error' ? true : undefined);

  if (props.as === 'select') {
    const { as: _as, ...rest } = props;
    return (
      <_ControlField
        {...rest}
        as="select"
        $size={size}
        $multiline={false}
        disabled={disabled}
        aria-invalid={ariaInvalid}
      />
    );
  }

  if (props.as === 'textarea') {
    const { as: _as, ...rest } = props;
    return (
      <_ControlField
        {...rest}
        as="textarea"
        $size={size}
        $multiline
        disabled={disabled}
        aria-invalid={ariaInvalid}
      />
    );
  }

  const { as: _as, ...rest } = props;
  return (
    <_ControlField
      {...rest}
      $size={size}
      $multiline={false}
      disabled={disabled}
      aria-invalid={ariaInvalid}
    />
  );
};

/**
 * The root is a <div>, not a <label>: the accessible label comes from Field
 * (or an explicit aria-label/aria-labelledby). Pressing the chrome around the
 * field still moves focus into it.
 */
const Control = ({
  size = 'medium',
  status = 'default',
  disabled = false,
  noBorder,
  alignStart,
  children,
  className,
  style,
  onClick,
  'data-testid': dataTestId,
}: ControlProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const ctx = useMemo(
    () => ({ size, disabled, status }),
    [size, disabled, status],
  );

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || !(event.target instanceof Element)) return;
    if (event.target.closest(INTERACTIVE)) return;
    const field = contentRef.current?.querySelector<HTMLElement>(
      'input, select, textarea',
    );
    if (!field) return;
    event.preventDefault();
    field.focus();
  };

  return (
    <_ControlRoot
      className={className}
      style={style}
      data-testid={dataTestId}
      onMouseDown={handleMouseDown}
      onClick={onClick}
      $size={size}
      $status={status}
      $isDisabled={disabled}
      $noBorder={noBorder}
    >
      <_ControlContext.Provider value={ctx}>
        <_ControlContent ref={contentRef} $alignStart={alignStart}>
          {children}
          <_ControlBackground $disabled={disabled} $noBorder={noBorder} />
        </_ControlContent>
      </_ControlContext.Provider>
    </_ControlRoot>
  );
};

const Compound: ControlCompound = Object.assign(Control, {
  Field: ControlField,
  Adornment: _ControlAdornment,
  Suffix: _ControlSuffix,
});

Compound.displayName = 'Control';

export { Compound as Control };
