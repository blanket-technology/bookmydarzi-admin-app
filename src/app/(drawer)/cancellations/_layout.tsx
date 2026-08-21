import { Stack } from 'expo-router';

export default function CancellationsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="policy" />
    </Stack>
  );
}
