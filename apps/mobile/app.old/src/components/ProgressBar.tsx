import React from 'react';
import { View, StyleSheet } from 'react-native';
import { C } from '@/lib/colors';

interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  color = C.accent,
  height = 6,
}) => {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped}%`, backgroundColor: color, height },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: C.border,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 99,
  },
});
