import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { useState } from "react";
import { useRouter } from "expo-router";
import NotificationTester from "../components/notification-tester";
import { useLogout } from "@/shared/hooks/uselogout";
  
export default function SettingsScreen() {
  const [showNotificationTester, setShowNotificationTester] = useState(false);

  const router = useRouter();
  const logout = useLogout();

  const handleSignOut = async () => {
    await logout();
    router.replace("/(auth)/onboarding");
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
