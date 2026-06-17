import { Pressable, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { colors } from '@onserve/ui-tokens';

export interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: any;
}

export function Button({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}: ButtonProps) {
  const styles = StyleSheet.create({
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.5 : 1,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonSecondary: {
      backgroundColor: colors.surface[2],
    },
    buttonGhost: {
      backgroundColor: 'transparent',
    },
    buttonSm: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
    },
    buttonMd: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonLg: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 12,
    },
    text: {
      fontWeight: '600',
      color: colors.text.primary,
    },
  });

  const variantStyle = useMemo(() => {
    switch (variant) {
      case 'primary':
        return styles.buttonPrimary;
      case 'secondary':
        return styles.buttonSecondary;
      case 'ghost':
        return styles.buttonGhost;
    }
  }, [variant, styles]);

  const sizeStyle = useMemo(() => {
    switch (size) {
      case 'sm':
        return styles.buttonSm;
      case 'md':
        return styles.buttonMd;
      case 'lg':
        return styles.buttonLg;
    }
  }, [size, styles]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, variantStyle, sizeStyle, style]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}
