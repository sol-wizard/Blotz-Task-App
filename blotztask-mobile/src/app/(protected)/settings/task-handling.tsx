import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

export default function TaskHandlingSettingsScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-[#F2F7FB]">
      <View className="items-center">
        <Text className="text-3xl font-balooExtraBold text-[#363853]">Task Handling</Text>
      </View>
    </SafeAreaView>
  );
}
