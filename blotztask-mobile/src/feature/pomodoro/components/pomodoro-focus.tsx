import { View, Text, Pressable, Modal } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

interface PomodoroFocusProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSoundscape: string;
  selectedDuration: number;
}

const FOCUS_GRADIENT_COLORS = ["#C2E49F", "#EEFBE1"] as const;
const FOCUS_TEXT_COLOR = "#6A7550";
// const FOCUS_CONGRATS_COLOR = "#444964";
const FOCUS_SOFT_TEXT_COLOR = "#00000033";
const FOCUS_BUBBLE_COLOR = "rgba(0, 0, 0, 0.08)";
const FOCUS_STROKE_COLOR = "rgba(255, 255, 255, 0.16)";
const FOCUS_BUTTON_COLOR = "#E7F7D7";
const STARS_COLORS = "#F3FADE";

function formatDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return "00:00";

  const totalSeconds = duration * 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const PomodoroFocus = ({
  isOpen,
  onClose,
  selectedSoundscape,
  selectedDuration,
}: PomodoroFocusProps) => {
  const { t } = useTranslation("pomodoro");
  const insets = useSafeAreaInsets();
  const timeText = formatDuration(selectedDuration);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="fade" transparent={false}>
      <LinearGradient colors={FOCUS_GRADIENT_COLORS} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: (insets.top || 44) + 8,
            paddingBottom: (insets.bottom || 20) + 12,
            paddingHorizontal: 20,
          }}
        >
          <View className="flex-row w-full items-center justify-between">
            <Pressable
              onPress={onClose}
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: FOCUS_BUBBLE_COLOR }}
              hitSlop={10}
            >
              <MaterialIcons
                name="arrow-back-ios"
                size={18}
                color={FOCUS_TEXT_COLOR}
                style={{ marginLeft: 6 }}
              />
            </Pressable>
            <View className="h-9 w-9" />
          </View>

          <View className="flex-1 items-center">
            <View className="mt-28 mb-8">
              <View
                className="rounded-full w-80 h-16 border px-4 py-2"
                style={{ backgroundColor: FOCUS_BUBBLE_COLOR, borderColor: FOCUS_STROKE_COLOR }}
              >
                <Text className="text-center justify-center text-[14px] font-baloo font-bold text-[#444964]">
                  You have been at it for an hour!
                </Text>
                <Text className="text-center justify-center text-[14px] font-baloo font-bold text-[#444964] -mt-2">
                  Take a tiny stretch!
                </Text>
              </View>
              <View className="mt-4 h-16 w-64 relative self-center">
                {/* stars */}
                <MaterialCommunityIcons
                  name="star"
                  size={26}
                  color={STARS_COLORS}
                  className="absolute top-2 left-6"
                  style={{ transform: [{ rotate: "-12deg" }] }}
                />
                <View className="absolute top-0 right-1/2 w-1.5 h-1.5 rounded-full bg-[#F3FADE] opacity-60" />
                <MaterialCommunityIcons
                  name="star"
                  size={36}
                  color={STARS_COLORS}
                  className="absolute -top-2 right-4"
                  style={{ transform: [{ rotate: "15deg" }] }}
                />
                <View className="absolute top-10 right-20 w-2 h-2 rounded-full bg-[#F3FADE] opacity-80" />
                <MaterialCommunityIcons
                  name="star"
                  size={14}
                  color={STARS_COLORS}
                  className="absolute top-10 left-16"
                />
              </View>
            </View>

            <View>
              <Text
                className="text-[80px] font-bold font-baloo"
                style={{ color: FOCUS_TEXT_COLOR, letterSpacing: 2 }}
              >
                {selectedDuration === 0 ? t("focusMode.flow") : timeText}
              </Text>
              <Pressable className="items-center justify-center -mt-4" onPress={onClose}>
                <Text
                  className="text-[20px] font-baloo font-bold"
                  style={{ color: FOCUS_TEXT_COLOR }}
                >
                  View my task
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="pb-2">
            <View className="mb-5 flex-row items-center justify-between px-12">
              <View className="items-center justify-center px-8 py-2 rounded-full">
                <Text
                  className="mb-2 text-[24px] font-baloo"
                  style={{ color: FOCUS_SOFT_TEXT_COLOR }}
                >
                  Pause
                </Text>
                <Pressable
                  className="h-20 w-20 flex-row items-center justify-center rounded-full"
                  style={{ backgroundColor: FOCUS_SOFT_TEXT_COLOR, gap: 10 }}
                >
                  <View
                    className="w-3.5 h-8 rounded-full"
                    style={{ backgroundColor: FOCUS_BUTTON_COLOR }}
                  />
                  <View
                    className="w-3.5 h-8 rounded-full"
                    style={{ backgroundColor: FOCUS_BUTTON_COLOR }}
                  />
                </Pressable>
              </View>

              <View className="items-center">
                <Text
                  className="mb-2 text-[24px] font-baloo"
                  style={{ color: FOCUS_SOFT_TEXT_COLOR }}
                >
                  End
                </Text>
                <Pressable
                  onPress={onClose}
                  className="h-20 w-20 items-center justify-center rounded-full"
                  style={{ backgroundColor: FOCUS_SOFT_TEXT_COLOR }}
                >
                  <View
                    className="w-8 h-8 rounded-md"
                    style={{
                      // width: 22,
                      // height: 22,
                      backgroundColor: FOCUS_BUTTON_COLOR,
                      // borderRadius: 7,
                    }}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
};
