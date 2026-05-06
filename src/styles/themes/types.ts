export type ZIndexes = {
  /** lowest: for backdrops or intentionally behind-base layers */
  background: number;
  /** default application layer */
  base: number;
  /** primary content layer above base */
  content: number;
  header: number;
  footer: number;
  modal: number;
  toast: number;
};

export type ColorsText = {
  primary: string;
  secondary: string;
  tertiary: string;
  /** text intended for use on dark surfaces */
  onDarkPrimary: string;
  onDarkSecondary: string;
  emphasis: string;
  accent: string;
  disabled: string;
};

export type ColorsSurface = {
  /** app background / page background */
  base: string;
  /** cards, sheets, raised containers */
  raised: string;
  /** dialogs, menus, popovers */
  overlay: string;
  /** subdued blocks, inputs, muted containers */
  muted: string;
  /** a surface specifically used in dark contexts */
  onDark: string;
  accent: string;
  glow: string;
  glowOnDark: string;
  transparent: string;
  divider: string;
};

export type ColorsBorder = {
  default: string;
  onDark: string;
  focus: string;
  transparent: string;
};

export type ColorsAction = {
  primary: string;
  primaryHover: string;
  primaryActive?: string;
  secondary: string;
  secondaryHover: string;
  secondaryActive?: string;
  tertiary: string;
  tertiaryHover: string;
  tertiaryActive?: string;
  accent: string;
  accentHover: string;
  accentActive?: string;
  disabled: string;
};

export type ColorsIcon = {
  primary: string;
  secondary: string;
  onDark: string;
  emphasis: string;
  accent: string;
  disabled: string;
};

export type ColorsAccent = {
  primary: {
    s50: string;
    s100: string;
  };
  secondary: {
    s50: string;
    s100: string;
  };
  tertiary: {
    s25: string;
    s50: string;
    s100: string;
  };
  quaternary: {
    s50: string;
    s100: string;
  };
  quinary: {
    s50: string;
    s100: string;
  };
};

export type ColorsTransparent = {
  transparent: string;
  /** dimmed overlay for modals, drawers, etc. */
  overlay: string;
  light: {
    s50: string; // 5%
    s150: string; // 15%
    s250: string; // 25%
  };
  dark: {
    s50: string; // 5%
    s150: string; // 15%
  };
};

export type ColorsStatus = {
  success: string;
  warning: string;
  error: string;
  info: string;
  brand: string;
  neutral: string;
};

export type Colors = {
  text: ColorsText;
  surface: ColorsSurface;
  border: ColorsBorder;
  action: ColorsAction;
  icon: ColorsIcon;
  accent: ColorsAccent;
  transparent: ColorsTransparent;
  status: ColorsStatus;
};

export type Theme = {
  colors: Colors;
  gradients: {
    successToError: string;
    lowToHigh: string;
    card: string;
    cardAlternate: string;
    appBackground: string;
    headerBackground: string;
  };
  shadows: {
    elevation: {
      sm: string;
      md: string;
      lg: string;
    };
    interactionStates: {
      hover: string;
      focus: string;
      active: string;
    };
  };
  fontFamilies: {
    primary: string;
    accent: string;
  };
  fontSizes: {
    caption: string;
    body: string;
    headingXLarge: string;
    headingLarge: string;
    headingMedium: string;
    headingSmall: string;
    headingXSmall: string;
    accentLarge: string;
    accentMedium: string;
    accentSmall: string;
    accentXSmall: string;
  };
  fontWeights: {
    primary: {
      regular: number;
      medium: number;
      semiBold: number;
    };
    accent: {
      regular: number;
    };
  };
  borderRadii: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  spacers: {
    none: string;
    xxxs: string;
    xxs: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  zIndexes: ZIndexes;
};
