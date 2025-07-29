// src/features/profile/ProfileScreen.tsx

import { useAuth } from "@/feature/auth/components/auth-context";
import { View } from "react-native";
import { Text, Button } from "react-native-paper";

export default function ProfileScreen() {
  const { logout } = useAuth();

  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Profile
      </Text>
      <Text className="text-center text-gray-500 mb-4">
        Manage your account settings
      </Text>
      <Button mode="outlined" onPress={logout} style={{ marginTop: 16 }}>
        Sign Out
      </Button>
    </View>
  );
}
