// src/features/ai/AIScreen.tsx
import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { router } from "expo-router";

export default function AIScreen() {
  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        AI Task Generator
      </Text>
      <Text className="text-center text-gray-500 mb-4">
        Generate your next task with AI assistance
      </Text>
      <Button mode="contained" onPress={() => router.push("/aigenerate")} style={{ marginTop: 16 }}>
        Open AI Generator
      </Button>
    </View>
  );
}
