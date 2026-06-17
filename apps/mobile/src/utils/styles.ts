import { StyleSheet } from 'react-native';
import { colors } from '@onserve/ui-tokens';

export const commonStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.surface[0],
  },
  screenContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  pageSubtitle: {
    color: colors.text.secondary,
    fontSize: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textPrimary: {
    color: colors.text.primary,
    fontSize: 16,
  },
  textSecondary: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  textTertiary: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  gap4: {
    gap: 16,
  },
  gap2: {
    gap: 8,
  },
});
