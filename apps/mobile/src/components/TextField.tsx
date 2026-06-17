import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { forwardRef } from 'react';
import { colors } from '@onserve/ui-tokens';

export type TextFieldProps = TextInputProps & {
  variant?: 'default' | 'error';
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ variant = 'default', style, ...props }, ref) => {
    const styles = StyleSheet.create({
      field: {
        borderWidth: 1,
        borderColor: variant === 'error' ? colors.semantic.error : colors.surface[2],
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.surface[0],
        color: colors.text.primary,
        fontSize: 16,
      },
    });

    return (
      <TextInput
        ref={ref}
        {...props}
        style={[styles.field, style]}
        placeholderTextColor={colors.text.muted}
      />
    );
  }
);

TextField.displayName = 'TextField';
