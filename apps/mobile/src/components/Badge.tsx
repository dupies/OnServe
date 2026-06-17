import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@onserve/ui-tokens';

export interface BadgeProps {
  label: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  style?: any;
}

export function Badge({
  label,
  color = 'primary',
  size = 'md',
  style,
}: BadgeProps) {
  const colorMap = {
    primary: colors.primary,
    success: colors.semantic.success,
    warning: colors.semantic.warning,
    error: colors.semantic.error,
    info: colors.semantic.info,
  };

  const sizeMap = {
    sm: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 },
    md: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 },
  };

  const styles = StyleSheet.create({
    badge: {
      backgroundColor: colorMap[color],
      borderRadius: 9999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontWeight: '500',
      color: colors.text.primary,
      ...sizeMap[size],
    },
  });

  return (
    <View style={[styles.badge, sizeMap[size], style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}
