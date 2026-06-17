import { Stack } from 'expo-router';
import '../global.css';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="(auth)"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="(customer)"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="(provider)"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="_storybook" />
    </Stack>
  );
}
