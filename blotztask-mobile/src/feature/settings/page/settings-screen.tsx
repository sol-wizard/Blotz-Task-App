import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "../../../constants/token-key";
import NotificationTester from "../components/notification-tester";
import SignalRConnectionTester from "../components/signalr-connection-tester";
import AITaskGenerator from "../../ai/components/ai-task-generator";

export default function SettingsScreen() {
  const [showNotificationTester, setShowNotificationTester] = useState(false);
  const [showSignalRTester, setShowSignalRTester] = useState(false);
  const [showAITaskGenerator, setShowAITaskGenerator] = useState(false);
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

      <Button
        mode="contained"
        onPress={() => setShowSignalRTester(!showSignalRTester)}
        style={{ marginTop: 16 }}
      >
        {showSignalRTester ? "Hide" : "Show"} SignalR Connection Tester
      </Button>

      {showSignalRTester && (
        <View style={{ width: "100%", marginTop: 16 }}>
          <SignalRConnectionTester />
        </View>
      )}

      <Button
        mode="contained"
        onPress={() => setShowAITaskGenerator(!showAITaskGenerator)}
        style={{ marginTop: 16 }}
      >
        {showAITaskGenerator ? "Hide" : "Show"} AI Task Generator
      </Button>

      {showAITaskGenerator && (
        <View style={{ width: "100%", marginTop: 16 }}>
          <AITaskGenerator />
        </View>
      )}

      <Button mode="outlined" style={{ marginTop: 16 }} onPress={handleSignOut}>
        Sign Out
      </Button>
    </View>
  );
}
