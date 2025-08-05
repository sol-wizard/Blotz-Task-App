import { Stack } from "expo-router";

export default function ProtectedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="chat" 
        options={{
          headerShown: true,
          title: "AI Chat",
          headerBackVisible: true,
          headerBackTitle: "Back",
        }} 
      />
    </Stack>
  );
}