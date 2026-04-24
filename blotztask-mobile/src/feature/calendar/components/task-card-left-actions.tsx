import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

type LeftActionsProps = {
  progress: SharedValue<number>;
  onMode: () => void;
  onFocus: () => void;
  isActiveTask?: boolean;
  isPaused?: boolean;
  onTogglePause?: () => void;
};
export const TaskCardLeftActions = ({
  progress,
  onMode,
  onFocus,
  isActiveTask,
  isPaused,
  onTogglePause,
}: LeftActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -120 * (1 - progress.value) }],
  }));
  const { t } = useTranslation("pomodoro");

  return (
    <Animated.View className="flex-row items-start justify-start gap-2 pr-4" style={animatedStyle}>
      {isActiveTask ? (
        <Pressable
          onPress={onTogglePause}
          className="h-full w-24 rounded-3xl bg-[#FFF0F0] border border-[#F567674D] items-center justify-center"
        >
          <View className="items-center gap-1.5">
            <Ionicons name={isPaused ? "play-circle" : "pause-circle"} size={28} color="#F87171" />
            <Text className="text-red-400 font-inter font-bold text-[13px]">
              {isPaused ? "Resume" : "Pause"}
            </Text>
          </View>
        </Pressable>
      ) : (
        <>
          <Pressable
            onPress={onMode}
            className="h-20 w-24 rounded-3xl bg-blue-50 border border-blue-300 items-center justify-center"
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
            className="h-20 w-24 rounded-3xl bg-orange-50 border border-orange-300 items-center justify-center"
          >
            <View className="items-center gap-1">
              <MaterialCommunityIcons name="clock" size={24} color="#FFAA4A" />
              <Text className="text-orange-400 font-inter font-semibold text-[13px]">
                {t("taskCard.focus")}
              </Text>
            </View>
          </Pressable>
        </>
      )}
    </Animated.View>
  );
};
