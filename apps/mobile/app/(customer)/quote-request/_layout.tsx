import { Stack } from 'expo-router';
import { colors } from '@onserve/ui-tokens';

export default function QuoteRequestLayout() {
  return (
    <Stack
      screenOptions={{
        title: 'Quote Request',
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: colors.primary,
        headerTitleStyle: {
          color: colors.text.primary,
          fontWeight: 'bold',
        },
        headerStyle: {
          backgroundColor: colors.surface[0],
        },
      }}
    />
  );
}
