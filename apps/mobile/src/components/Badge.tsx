import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '@/lib/colors';

type BadgeVariant = 'green' | 'amber' | 'red' | 'purple' | 'gray';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  green: { bg: `${C.accent}22`, text: C.accent },
  amber: { bg: `${C.amber}22`, text: C.amber },
  red: { bg: `${C.red}22`, text: C.red },
  purple: { bg: `${C.purple}22`, text: C.purple },
  gray: { bg: `${C.muted}22`, text: C.muted },
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'gray' }) => {
  const colors = variantColors[variant];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
