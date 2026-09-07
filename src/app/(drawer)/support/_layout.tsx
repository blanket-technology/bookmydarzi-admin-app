import { Stack } from 'expo-router';

// One Stack for the whole merged Support surface (Conversations + Tickets
// tabs live in index.tsx; chat/[sessionId] and tickets/[id]/new are pushed
// on top of it) so back-navigation from any detail screen returns here
// instead of falling through to the Drawer's default screen.
export default function SupportStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat/[sessionId]" />
      <Stack.Screen name="tickets/[id]" />
      <Stack.Screen name="tickets/new" />
      <Stack.Screen name="analytics" />
    </Stack>
  );
}
