import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";

interface ReturnButtonProps {
  className?: string;
  onPress?: () => void;
}

export const ReturnButton = ({ className = "", onPress }: ReturnButtonProps) => {
  const router = useRouter();
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(protected)/(tabs)");
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      className={`w-8 h-8 rounded-full border border-gray-300 items-center justify-center ${className}`}
    >
      <MaterialCommunityIcons name="chevron-left" size={22} color="#6B7280" />
    </Pressable>
  );
};
