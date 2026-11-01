import { VoztriColors } from './colors.js';
import { VoztriTypography } from './typography.js';
import { VoztriSpacing, VoztriRadii, VoztriElevation } from './spacing.js';

export const lightTheme = {
  colors: VoztriColors.light,
  brand: VoztriColors.brand,
  typography: VoztriTypography,
  spacing: VoztriSpacing,
  radii: VoztriRadii,
  elevation: VoztriElevation,
  isDark: false,
};

export const darkTheme = {
  colors: VoztriColors.dark,
  brand: VoztriColors.brand,
  typography: VoztriTypography,
  spacing: VoztriSpacing,
  radii: VoztriRadii,
  elevation: VoztriElevation,
  isDark: true,
};

export type VoztriTheme = typeof lightTheme;

