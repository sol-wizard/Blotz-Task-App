import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { useLogout } from "@/shared/hooks/uselogout";

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useLogout();

  const handleSignOut = async () => {
    await logout();
    router.replace("/(auth)/onboarding");
  };

  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Settings
      </Text>

      <Button mode="outlined" style={{ marginTop: 16 }} onPress={handleSignOut}>
        Sign Out
      </Button>
    </View>
  );
}
