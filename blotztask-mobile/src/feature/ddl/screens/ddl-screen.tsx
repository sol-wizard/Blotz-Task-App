import { View, Text } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";

export default function DdlScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-lg">DDL page</Text>

      <View className="absolute top-20 left-4">
        <ReturnButton />
      </View>
    </View>
  );
}
