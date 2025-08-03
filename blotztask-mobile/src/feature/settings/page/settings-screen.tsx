// src/features/notifications/NotificationsScreen.tsx
import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { router } from "expo-router";
import { useAuth } from "@/feature/auth/auth-context";

export default function SettingsScreen() {
  const { logout } = useAuth();
  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Notifications & Settings
      </Text>

      <Button
        mode="contained"
        onPress={() => router.push("/notification" as any)}
        style={{ marginTop: 16 }}
      >
        Test Notifications
      </Button>

      <Button
        mode="contained"
        onPress={() => router.push("/signalRConnection" as any)}
        style={{ marginTop: 16 }}
      >
        Test SignalR Connection
      </Button>
      <Button mode="outlined" onPress={logout} style={{ marginTop: 16 }}>
        Sign Out
      </Button>
    </View>
  );
}
