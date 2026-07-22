export const colors = {
  brand: {
    navy: '#002B8F',
    royal: '#0D47C9',
    electric: '#2563EB',
    orange: '#FF5A00',
    orangeSoft: '#FF7A1A',
  },
  bg: {
    app: '#F4F4F4',
    surface: '#FFFFFF',
  },
  text: {
    primary: '#1E1E1E',
    secondary: '#52525B',
  },
  border: {
    default: '#D8DAE3',
  },
  action: {
    primary: '#0D47C9',
    focus: '#2563EB',
  },
  attention: '#FF5A00',
  success: '#166534',
  danger: '#B91C1C',
  neutral: {
    white: '#FFFFFF',
  },
} as const;

export const typography = {
  fontFamily: {
    heading: '"Sora", sans-serif',
    body: '"Inter", sans-serif',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.2',
    base: '1.5',
    relaxed: '1.75',
  },
} as const;

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.07)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} as const;

export type Tokens = typeof tokens;
