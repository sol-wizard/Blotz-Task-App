import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

type LeftActionsProps = {
  progress: SharedValue<number>;
  onMode: () => void;
  onFocus: () => void;
};
export const TaskCardLeftActions = ({ progress, onMode, onFocus }: LeftActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -120 * (1 - progress.value) }],
  }));
  const { t } = useTranslation("pomodoro");

  return (
    <Animated.View className="flex-row items-start justify-start gap-2 pr-4" style={animatedStyle}>
      <Pressable
        onPress={onMode}
        className="min-h-20 w-24 rounded-3xl bg-blue-50 border border-blue-300 items-center justify-center"
      >
        <View className="items-center gap-1">
          <MaterialCommunityIcons name="cog" size={24} color="#53A8FF" />
          <Text className="text-blue-400 font-inter font-semibold text-[13px]">
            {t("taskCard.modes")}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onFocus}
        className="min-h-20 w-24 rounded-3xl bg-orange-50 border border-orange-300 items-center justify-center"
      >
        <View className="items-center gap-1">
          <MaterialCommunityIcons name="clock" size={24} color="#FFAA4A" />
          <Text className="text-orange-400 font-inter font-semibold text-[13px]">
            {t("taskCard.focus")}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};
