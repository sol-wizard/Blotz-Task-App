import Ionicons from "@react-native-vector-icons/ionicons/static";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

type LeftActionsProps = {
  progress: SharedValue<number>;
  onMode: () => void;
  onFocus: () => void;
  isPomodoroActiveTask?: boolean;
  isPaused?: boolean;
  onTogglePause?: () => void;
};
export const TaskCardLeftActions = ({
  progress,
  onMode,
  onFocus,
  isPomodoroActiveTask,
  isPaused,
  onTogglePause,
}: LeftActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const { t } = useTranslation("pomodoro");

  const modeTap = Gesture.Tap().runOnJS(true).onEnd(() => onMode());
  const focusTap = Gesture.Tap().runOnJS(true).onEnd(() => onFocus());
  const pauseTap = Gesture.Tap().runOnJS(true).onEnd(() => onTogglePause?.());

  return (
    <Animated.View pointerEvents="box-none" className="flex-row items-start justify-start gap-2 pr-4" style={animatedStyle}>
      {isPomodoroActiveTask ? (
        <GestureDetector gesture={pauseTap}>
          <View className="h-full w-24 rounded-3xl bg-[#FFF0F0] border border-[#F567674D] items-center justify-center">
            <View className="items-center gap-1.5">
              <Ionicons name={isPaused ? "play-circle" : "pause-circle"} size={28} color="#F87171" />
              <Text className="text-red-400 font-inter font-bold text-[13px]">
                {isPaused ? "Resume" : "Pause"}
              </Text>
            </View>
          </View>
        </GestureDetector>
      ) : (
        <>
          <GestureDetector gesture={modeTap}>
            <View className="h-20 w-24 rounded-3xl bg-blue-50 border border-blue-300 items-center justify-center">
              <View className="items-center gap-1">
                <MaterialCommunityIcons name="cog" size={24} color="#53A8FF" />
                <Text className="text-blue-400 font-inter font-semibold text-[13px]">
                  {t("taskCard.modes")}
                </Text>
              </View>
            </View>
          </GestureDetector>

          <GestureDetector gesture={focusTap}>
            <View className="h-20 w-24 rounded-3xl bg-orange-50 border border-orange-300 items-center justify-center">
              <View className="items-center gap-1">
                <MaterialCommunityIcons name="clock" size={24} color="#FFAA4A" />
                <Text className="text-orange-400 font-inter font-semibold text-[13px]">
                  {t("taskCard.focus")}
                </Text>
              </View>
            </View>
          </GestureDetector>
        </>
      )}
    </Animated.View>
  );
};
