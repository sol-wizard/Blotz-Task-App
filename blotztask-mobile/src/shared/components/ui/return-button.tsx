import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable } from "react-native";

export const ReturnButton = () => {
  return (
    <Pressable
      onPress={() => router.back()}
      className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center"
    >
      <MaterialCommunityIcons name="chevron-left" size={22} color="#6B7280" />
    </Pressable>
  );
};
