import type { Config } from 'tailwindcss';
import { colors, spacing, radius, shadows } from './index';

/**
 * Shared Tailwind v4 configuration
 * Used by both web and mobile applications
 *
 * Import this in your tailwind.config.ts:
 * import { sharedTailwindConfig } from '@onserve/ui-tokens/tailwind';
 *
 * Then spread it into your config:
 * export default {
 *   ...sharedTailwindConfig,
 *   content: ['./your-content-globs/**\/*.{js,ts,jsx,tsx}'],
 * };
 */
export const sharedTailwindConfig: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        surface: {
          0: colors.surface[0],
          1: colors.surface[1],
          2: colors.surface[2],
          3: colors.surface[3],
        },
        primary: colors.primary,
        'primary-dark': colors.primaryDark,
        'primary-light': colors.primaryLight,
        text: {
          primary: colors.text.primary,
          secondary: colors.text.secondary,
          tertiary: colors.text.tertiary,
          muted: colors.text.muted,
        },
        border: colors.border,
        input: colors.input,
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        error: colors.semantic.error,
        info: colors.semantic.info,
        /* shadcn/ui legacy aliases */
        secondary: colors.secondary,
        accent: colors.accent,
        popover: colors.popover,
        purple: colors.purple,
        destructive: colors.destructive,
        ring: colors.ring,
      },
      spacing: {
        0: spacing[0],
        1: spacing[1],
        2: spacing[2],
        3: spacing[3],
        4: spacing[4],
        5: spacing[5],
        6: spacing[6],
        7: spacing[7],
        8: spacing[8],
        10: spacing[10],
        12: spacing[12],
        16: spacing[16],
        20: spacing[20],
        24: spacing[24],
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        xl: radius.xl,
        '2xl': radius['2xl'],
        full: radius.full,
      },
      boxShadow: {
        sm: shadows.sm,
        md: shadows.md,
        lg: shadows.lg,
        xl: shadows.xl,
      },
      fontFamily: {
        sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      },
    },
  },
};

export default sharedTailwindConfig;
