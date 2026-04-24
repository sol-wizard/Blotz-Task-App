import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";

type Props = {
  message: string;
  resetErrorBoundary: () => void;
};

export function ErrorPlaceholder({ message, resetErrorBoundary }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-10 gap-5">
      <View className="w-24 h-24 rounded-full items-center justify-center">
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={52}
          color={theme.colors.warning}
        />
      </View>
      <Text className="font-balooBold text-xl text-center" style={{ color: theme.colors.warning }}>
        {message}
      </Text>
      <Pressable
        onPress={resetErrorBoundary}
        className="px-6 py-3 rounded-2xl bg-black"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="font-balooBold text-base text-white">Try again</Text>
      </Pressable>
    </View>
  );
}
