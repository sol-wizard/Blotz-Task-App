import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "../../../shared/constants/token-key";
import NotificationTester from "../components/notification-tester";

export default function SettingsScreen() {
  const [showNotificationTester, setShowNotificationTester] = useState(false);

  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Remove the token from secure storage
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);

      // Navigate back to login
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Notifications & Settings
      </Text>

      <Button
        mode="contained"
        onPress={() => setShowNotificationTester(!showNotificationTester)}
        style={{ marginTop: 16 }}
      >
        {showNotificationTester ? "Hide" : "Show"} Notification Tester
      </Button>

      {showNotificationTester && (
        <View style={{ width: "100%", marginTop: 16 }}>
          <NotificationTester />
        </View>
      )}

      <Button mode="outlined" style={{ marginTop: 16 }} onPress={handleSignOut}>
        Sign Out
      </Button>
    </View>
  );
}
