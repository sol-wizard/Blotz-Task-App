import { theme } from "@/shared/constants/theme";
import { Stack } from "expo-router";

export default function ProtectedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="ai-task-generator"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: true,
          headerTintColor: "#8E8E93",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="ai-breakdown"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: true,
          headerTintColor: "#8E8E93",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="task-details"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: true,
          headerStyle: {
            backgroundColor: "#d9f99d", // Custom header background
          },
          headerTintColor: "#8E8E93",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="task-edit"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: true,
          headerTintColor: "#8E8E93",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="task-create"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: true,
          headerTintColor: "#8E8E93",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="ideas"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.secondary,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
    </Stack>
  );
}
