import { Stack } from 'expo-router';

// Nested Stack so `router.back()` / Android hardware back from orders/[id]
// pops to orders/index within this section's own history, instead of
// falling through to the Drawer's default screen (dashboard) — a flat
// Drawer.Screen list has no shared history between siblings.
export default function OrdersStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
