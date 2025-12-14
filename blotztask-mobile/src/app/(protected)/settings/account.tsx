import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";

export default function AccountScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">Account</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
