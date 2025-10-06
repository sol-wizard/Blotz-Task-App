import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { useLogout } from "@/shared/hooks/uselogout";
import { useSelectedDayTaskStore } from "@/shared/stores/selectedday-task-store";

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useLogout();
  const { getReminder } = useSelectedDayTaskStore();

  const handleSignOut = async () => {
    await logout();
    router.replace("/(auth)/onboarding");
  };

  const handleGetReminder = async () => {
    getReminder();
  };

  const goToIdeasPage = async () => {
    router.push("/(protected)/ideas");
  };

  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Settings
      </Text>
      <Button mode="outlined" style={{ marginTop: 16 }} onPress={goToIdeasPage}>
        Go to Ideas page
      </Button>
      <Button mode="outlined" style={{ marginTop: 16 }} onPress={handleGetReminder}>
        Get Today&apos;s Reminder
      </Button>

      <Button mode="outlined" style={{ marginTop: 16 }} onPress={handleSignOut}>
        Sign Out
      </Button>
    </View>
  );
}
