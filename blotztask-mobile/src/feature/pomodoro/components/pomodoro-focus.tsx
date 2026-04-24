import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { ReturnButton } from "@/shared/components/return-button";
import { usePomodoroTimer } from "../hooks/usePomodoroTimer";
import { getMilestoneKey } from "../utils/milestone-copywrites";

interface PomodoroFocusProps {
  onEnd: () => void;
  onMinimize: (elapsedSeconds: number, isPaused: boolean) => void;
  selectedSoundscape: string;
  selectedDuration: number;
  selectedCountdown: boolean;
  initialElapsedSeconds: number;
  initialIsPaused: boolean;
}

export const PomodoroFocus = ({
  onEnd,
  onMinimize,
  selectedSoundscape,
  selectedDuration,
  selectedCountdown,
  initialElapsedSeconds,
  initialIsPaused,
}: PomodoroFocusProps) => {
  const { t } = useTranslation("pomodoro");

  const { displayTimeStr, elapsedSeconds, isPaused, togglePause } = usePomodoroTimer(
    selectedDuration,
    selectedCountdown,
    initialElapsedSeconds,
    initialIsPaused,
  );

  const milestoneKey = getMilestoneKey(elapsedSeconds);

  return (
    <LinearGradient colors={["#C2E49F", "#EEFBE1"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 px-5 pt-2 pb-3">
        <View className="flex-row w-full items-center justify-between">
          <ReturnButton
            className="w-20 h-20 border-0 bg-[#00000014]"
            onPress={() => onMinimize(elapsedSeconds, isPaused)}
          />
        </View>

        <View className="flex-1 items-center">
          <View className="mt-28 mb-8">
            {milestoneKey && (
              <View className="rounded-full w-80 min-h-16 px-5 py-3 items-center justify-center bg-[#00000014]">
                <Text className="text-base font-baloo font-bold text-[#444964] leading-5 text-center">
                  {t(`focusMode.milestones.${milestoneKey}.title`)}
                </Text>
                <Text className="text-base font-baloo font-bold text-[#444964] leading-5 text-center">
                  {t(`focusMode.milestones.${milestoneKey}.subtitle`)}
                </Text>
              </View>
            )}
            <View className="mt-4 h-16 w-64 relative self-center">
              {/* stars */}
              {/* TODO: gradient and decorative stars are static now; replace with motion animation later */}
              <MaterialCommunityIcons
                name="star"
                size={26}
                color="#F3FADE"
                className="absolute top-2 left-6"
                style={{ transform: [{ rotate: "-12deg" }] }}
              />
              <View className="absolute top-0 right-1/2 w-1.5 h-1.5 rounded-full bg-[#F3FADE] opacity-60" />
              <MaterialCommunityIcons
                name="star"
                size={36}
                color="#F3FADE"
                className="absolute -top-2 right-4"
                style={{ transform: [{ rotate: "15deg" }] }}
              />
              <View className="absolute top-10 right-20 w-2 h-2 rounded-full bg-[#F3FADE] opacity-80" />
              <MaterialCommunityIcons
                name="star"
                size={14}
                color="#F3FADE"
                className="absolute top-10 left-16"
              />
            </View>
          </View>

          <View className="mt-8 pt-2 item-center">
            <Text className="text-8xl font-bold font-baloo pt-4 tracking-wide text-[#00000080]">
              {displayTimeStr}
            </Text>
            <Pressable
              className="items-center justify-center -mt-4"
              onPress={() => onMinimize(elapsedSeconds, isPaused)}
            >
              <Text className="text-xl font-baloo font-bold text-[#00000080]">
                {t("focusMode.viewTask")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="w-full mb-8 flex-row items-center justify-between px-12">
          <View className="items-center justify-center px-8 py-2 rounded-full">
            <Text className="mb-2 text-2xl font-baloo text-[#00000033]">
              {isPaused ? t("focusMode.resume", "Resume") : t("focusMode.pause")}
            </Text>
            <Pressable
              className="h-20 w-20 flex-row items-center justify-center rounded-full bg-[#00000033] gap-3"
              onPress={togglePause}
            >
              {isPaused ? (
                <Ionicons name="play" size={48} color="#E7F7D7" className="ml-1" />
              ) : (
                <>
                  <View className="w-3.5 h-8 rounded-full bg-[#E7F7D7]" />
                  <View className="w-3.5 h-8 rounded-full bg-[#E7F7D7]" />
                </>
              )}
            </Pressable>
          </View>

          <View className="items-center">
            <Text className="mb-2 text-2xl font-baloo text-[#00000033]">{t("focusMode.end")}</Text>
            <Pressable
              className="h-20 w-20 items-center justify-center rounded-full bg-[#00000033]"
              onPress={onEnd}
            >
              <View className="w-8 h-8 rounded-md bg-[#E7F7D7]" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};
