import { View, Text } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DdlScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg">DDL page</Text>
      </View>
    </SafeAreaView>
  );
}
