import { ReturnButton } from "@/shared/components/ui/return-button";
import { SafeAreaView, View, Text } from "react-native";

export default function AvatarScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">Avatar</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
