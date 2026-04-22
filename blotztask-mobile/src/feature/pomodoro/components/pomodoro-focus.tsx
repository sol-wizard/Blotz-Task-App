import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDuration } from "../utils/format-duration";
import { ReturnButton } from "@/shared/components/return-button";

interface PomodoroFocusProps {
  onClose: () => void;
  selectedSoundscape: string;
  selectedDuration: number;
  selectedCountdown: boolean;
}

export const PomodoroFocus = ({
  onClose,
  selectedSoundscape,
  selectedDuration,
  selectedCountdown,
}: PomodoroFocusProps) => {
  const { t } = useTranslation("pomodoro");
  const shouldCountDown = selectedCountdown && selectedDuration > 0;
  const displayTime = shouldCountDown ? formatDuration(selectedDuration) : "00:00";

  return (
    <LinearGradient colors={["#C2E49F", "#EEFBE1"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 px-5 pt-2 pb-3">
        <View className="flex-row w-full items-center justify-between">
          <ReturnButton className="w-20 h-20 border-0 bg-[#00000014]" />
        </View>

        <View className="flex-1 items-center">
          <View className="mt-28 mb-8">
            <View className="rounded-full w-80 min-h-16 px-5 py-3 items-center justify-center bg-[#00000014]">
              <Text className="text-base font-baloo font-bold text-[#444964] leading-5 text-center">
                {t("focusMode.stretchTitle")}
              </Text>
              <Text className="text-base font-baloo font-bold text-[#444964] leading-5 text-center">
                {t("focusMode.stretchSubtitle")}
              </Text>
            </View>
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
              {displayTime}
            </Text>
            <Pressable className="items-center justify-center -mt-4" onPress={onClose}>
              <Text className="text-xl font-baloo font-bold text-[#00000080]">
                {t("focusMode.viewTask")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="w-full mb-8 flex-row items-center justify-between px-12">
          <View className="items-center justify-center px-8 py-2 rounded-full">
            <Text className="mb-2 text-2xl font-baloo text-[#00000033]">
              {t("focusMode.pause")}
            </Text>
            <Pressable className="h-20 w-20 flex-row items-center justify-center rounded-full bg-[#00000033] gap-3">
              <View className="w-3.5 h-8 rounded-full bg-[#E7F7D7]" />
              <View className="w-3.5 h-8 rounded-full bg-[#E7F7D7]" />
            </Pressable>
          </View>

          <View className="items-center">
            <Text className="mb-2 text-2xl font-baloo text-[#00000033]">{t("focusMode.end")}</Text>
            <Pressable
              // onPress={onClose}
              className="h-20 w-20 items-center justify-center rounded-full bg-[#00000033]"
            >
              <View className="w-8 h-8 rounded-md bg-[#E7F7D7]" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};
