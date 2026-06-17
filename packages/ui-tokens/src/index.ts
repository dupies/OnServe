/**
 * OnServe Design Tokens
 * Shared design system constants for web and mobile applications
 */

export const colors = {
  surface: {
    0: '#0a0a0f',      /* Darkest, app background */
    1: '#13131a',      /* Slightly lighter, cards */
    2: '#1c1c26',      /* Hover/active states */
    3: '#25252f',      /* Subtle elevation */
  },
  primary: '#00d97e',
  primaryDark: '#00b366',
  primaryLight: '#00ff99',
  text: {
    primary: '#ffffff',
    secondary: '#a8aab8',
    tertiary: '#6b6d7d',
    muted: '#888898',
  },
  border: '#2a2a38',
  input: '#2a2a38',
  semantic: {
    success: '#10b981',
    warning: '#f5a623',
    error: '#e8453c',
    info: '#3b82f6',
  },
  /* Legacy shadcn/ui aliases */
  secondary: '#1c1c26',
  accent: '#1c1c26',
  popover: '#13131a',
  purple: '#7b6ef6',
  destructive: '#e8453c',
  ring: '#00d97e',
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

export const radius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.25rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
} as const;

export const fonts = {
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
} as const;

/**
 * Type-safe token access
 * Use these types when building themed components
 */
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadows = typeof shadows;
export type Fonts = typeof fonts;

/**
 * All tokens as a single namespace (useful for design system references)
 */
export const tokens = {
  colors,
  spacing,
  radius,
  shadows,
  fonts,
} as const;

export default tokens;
