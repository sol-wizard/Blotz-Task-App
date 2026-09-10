import { Pressable, Text } from "react-native";
import Animated from "react-native-reanimated";
import LottieView from "lottie-react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";

const IDLE_FG = "#2F80ED";
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
      {({ pressed }) => {
        // `pressed` lands on the touch frame; isRecording lags behind recorder setup.
        const isActive = isRecording || pressed;
        const fg = isActive ? "white" : IDLE_FG;
        return (
          <Animated.View
            className="w-full h-14 rounded-full flex-row items-center justify-center gap-2"
            style={[
              shadow,
              {
                backgroundColor: isActive ? ACTIVE_BG : "white",
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
                <MaterialCommunityIcons name="microphone" size={24} color={fg} />
                <Text className="font-balooBold text-base" style={{ color: fg }}>
                  {t("buttons.holdToTalk")}
                </Text>
              </>
            )}
          </Animated.View>
        );
      }}
    </Pressable>
  );
}
