import { View, Pressable, StyleSheet } from 'react-native';
import { ReactNode } from 'react';
import { colors } from '@onserve/ui-tokens';

export interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated';
  style?: any;
  onPress?: () => void;
}

export function Card({ children, variant = 'default', style, onPress }: CardProps) {
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface[1],
      borderRadius: 8,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: variant === 'elevated' ? 0.3 : 0.2,
      shadowRadius: variant === 'elevated' ? 6 : 4,
      shadowOffset: { width: 0, height: variant === 'elevated' ? 4 : 2 },
      elevation: variant === 'elevated' ? 8 : 4,
    },
  });

  const content = <View style={[styles.card, style]}>{children}</View>;

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}
