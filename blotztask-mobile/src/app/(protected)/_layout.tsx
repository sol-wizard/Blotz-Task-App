import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function ProtectedLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="ai-planner"
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
        </Stack>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
