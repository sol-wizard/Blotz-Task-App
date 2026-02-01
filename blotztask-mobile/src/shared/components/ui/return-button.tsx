import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";

export const ReturnButton = () => {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(protected)/(tabs)");
        }
      }}
      hitSlop={10}
      className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center"
    >
      <MaterialCommunityIcons name="chevron-left" size={22} color="#6B7280" />
    </Pressable>
  );
};
