import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View, Pressable } from "react-native";
import { useState } from "react";
import { ReturnButton } from "@/shared/components/ui/return-button";

export default function TaskHandlingScreen() {
  const [isAutoRolloverEnabled, setIsAutoRolloverEnabled] = useState(false);

  const toggleAutoRollover = () => {
    setIsAutoRolloverEnabled((pre) => !pre);
    console.log(`Auto Rollover ${isAutoRolloverEnabled ? "enabled" : "disabled"}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">Task Handling</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between bg-white rounded-2xl px-6 py-4 mt-8 mx-6">
        <View className="flex-1 mr-4">
          <Text className="text-lg font-baloo text-secondary">Auto Rollover</Text>
          <Text className="text-sm text-primary font-balooThin mt-1">
            Move overdue tasks to today automatically.
          </Text>
        </View>

        <Pressable
          onPress={toggleAutoRollover}
          className={`w-12 h-7 rounded-full p-1 ${
            isAutoRolloverEnabled ? "bg-highlight" : "bg-gray-300"
          }`}
        >
          <View
            className={`w-5 h-5 rounded-full bg-white ${
              isAutoRolloverEnabled ? "self-end" : "self-start"
            }`}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
