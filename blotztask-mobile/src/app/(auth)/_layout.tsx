import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
<<<<<<< HEAD
=======
      <Stack.Screen name="login" options={{ headerShown: false }} />
>>>>>>> 6eb4676 (Frontend refactor (#467))
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}
