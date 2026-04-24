import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";

type Props = {
  message: string;
  resetErrorBoundary: () => void;
};

export function ErrorPlaceholder({ message, resetErrorBoundary }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-3">
      <MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.colors.warning} />
      <Text className="font-balooBold text-lg text-center" style={{ color: theme.colors.warning }}>
        {message}
      </Text>
      <Pressable
        onPress={resetErrorBoundary}
        className="px-6 py-2 rounded-xl bg-background"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="font-baloo text-sm text-primary">Retry</Text>
      </Pressable>
    </View>
  );
}
