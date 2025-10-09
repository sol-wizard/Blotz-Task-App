import { theme } from "@/shared/constants/theme";
import { Stack } from "expo-router";
import { useSelectedTaskStore } from "@/shared/stores/selected-task-store";

export default function ProtectedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />

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
        options={() => {
          const { selectedTask } = useSelectedTaskStore.getState();
          const headerBackgroundColor = selectedTask?.label?.color ?? theme.colors.fallback;

          return {
            headerShown: true,
            headerShadowVisible: false,
            headerTitle: "",
            headerBackVisible: true,
            headerTintColor: "#000000",
            headerBackButtonDisplayMode: "minimal",
            headerStyle: {
              backgroundColor: headerBackgroundColor,
            },
          };
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
