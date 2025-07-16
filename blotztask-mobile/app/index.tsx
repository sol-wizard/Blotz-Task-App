import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text, Button } from "react-native-paper";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={{ marginTop: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Welcome to Blotz!
      </Text>

      <Text className="text-center text-gray-500 mb-4">
        Hello, default user{"\n"}
        Ready to generate your next task?
      </Text>

      <Button
        mode="contained"
        onPress={() => router.push("/aigenerate")}
        style={{ marginTop: 16 }}
      >
        Go to AI Task Generator
      </Button>

      <Button mode="outlined" onPress={logout} style={{ marginTop: 16 }}>
        Sign Out
      </Button>
    </View>
  );
}
