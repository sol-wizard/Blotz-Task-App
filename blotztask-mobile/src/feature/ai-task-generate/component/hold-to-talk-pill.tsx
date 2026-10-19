import { Pressable, Text } from "react-native";
import Animated from "react-native-reanimated";
import LottieView from "lottie-react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";

const IDLE_BG = "rgba(255,255,255,0.25)"; // frosted over the sheet gradient
const PRESSED_BG = "rgba(255,255,255,0.5)";
const ACTIVE_BG = "#9AD513"; // waveform Lottie is white, needs a coloured ground

const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 5,
} as const;

type Props = {
  isRecording: boolean;
  disabled: boolean;
  minHoldMs: number;
  onPressIn: () => void;
  onPressOut: () => void;
  onHeldLongEnough: () => void;
};

export function HoldToTalkPill({
  isRecording,
  disabled,
  minHoldMs,
  onPressIn,
  onPressOut,
  onHeldLongEnough,
}: Props) {
  const { t } = useTranslation("aiTaskGenerate");

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onHeldLongEnough}
      delayLongPress={minHoldMs}
      pressRetentionOffset={24}
      className="w-full"
      disabled={disabled}
    >
      {({ pressed }) => (
        <Animated.View
          className="w-full h-14 rounded-full flex-row items-center justify-center gap-2"
          style={[
            // The frosted pill sits flat on the gradient; only the green
            // recording ground is lifted off it.
            isRecording && shadow,
            {
              // `pressed` lands on the touch frame, so it brightens the pill
              // while isRecording is still catching up with recorder setup.
              backgroundColor: isRecording ? ACTIVE_BG : pressed ? PRESSED_BG : IDLE_BG,
              opacity: disabled ? 0.5 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              transitionProperty: ["transform", "backgroundColor"],
              transitionDuration: 120,
            },
          ]}
        >
          {isRecording ? (
            <LottieView
              source={LOTTIE_ANIMATIONS.voiceWave}
              loop
              autoPlay
              style={{ width: "100%", height: 40 }}
              resizeMode="contain"
            />
          ) : (
            <>
              <MaterialCommunityIcons name="microphone" size={24} color="white" />
              <Text className="font-balooBold text-base text-white">
                {t("buttons.holdToTalk")}
              </Text>
            </>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}
