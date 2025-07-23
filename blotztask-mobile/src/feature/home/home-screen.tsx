// src/features/home/HomeScreen.tsx
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function HomeScreen() {
  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Welcome to Blotz!
      </Text>
      <Text className="text-center text-gray-500 mb-4">
        Hello, default user{"\n"}Use the navigation below to explore the app
      </Text>
    </View>
  );
}
