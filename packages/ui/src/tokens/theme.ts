import { tokens } from './index';

export const theme = {
  colors: tokens.colors,
  typography: tokens.typography,
  spacing: tokens.spacing,
  borderRadius: tokens.borderRadius,
  shadows: tokens.shadows,
} as const;

export type Theme = typeof theme;
