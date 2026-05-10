import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '@/lib/colors';

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 48,
  color = C.purple,
}) => {
  const initials = getInitials(name);
  const fontSize = size * 0.36;
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}33`,
          borderColor: color,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize, color }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  initials: {
    fontWeight: '700',
  },
});
