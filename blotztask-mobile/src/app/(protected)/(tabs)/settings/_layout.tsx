import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ headerShown: false }} />
      <Stack.Screen name="beta-features" options={{ headerShown: false }} />
      <Stack.Screen name="ai-memory" options={{ headerShown: false }} />
      <Stack.Screen name="all-tasks" options={{ headerShown: false }} />
      <Stack.Screen name="update-user-name" options={{ headerShown: false }} />
      <Stack.Screen name="avatar" options={{ headerShown: false }} />
      <Stack.Screen name="membership-plan" options={{ headerShown: false }} />
      <Stack.Screen name="support-us" options={{ headerShown: false }} />
    </Stack>
  );
}
