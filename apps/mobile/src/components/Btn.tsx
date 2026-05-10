import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { C } from '@/lib/colors';

type BtnVariant = 'accent' | 'purple' | 'outline' | 'danger';

interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const variantStyles: Record<BtnVariant, { container: ViewStyle; text: TextStyle }> = {
  accent: {
    container: { backgroundColor: C.accent },
    text: { color: '#000' },
  },
  purple: {
    container: { backgroundColor: C.purple },
    text: { color: '#fff' },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border },
    text: { color: C.text },
  },
  danger: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.red },
    text: { color: C.red },
  },
};

export const Btn: React.FC<BtnProps> = ({
  label,
  onPress,
  variant = 'accent',
  loading = false,
  disabled = false,
  style,
}) => {
  const vs = variantStyles[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        vs.container,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'accent' ? '#000' : '#fff'} />
      ) : (
        <Text style={[styles.label, vs.text]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
