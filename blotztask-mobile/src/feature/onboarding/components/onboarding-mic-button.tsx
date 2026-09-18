import { Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";

const SIZE = 112;

const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;

type Props = {
  isRecording: boolean;
  disabled: boolean;
  minHoldMs: number;
  accessibilityLabel: string;
  onPressIn: () => void;
  onPressOut: () => void;
  onHeldLongEnough: () => void;
};

/** The large hold-to-talk button. Same press contract as HoldToTalkPill. */
export function OnboardingMicButton({
  isRecording,
  disabled,
  minHoldMs,
  accessibilityLabel,
  onPressIn,
  onPressOut,
  onHeldLongEnough,
}: Props) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onHeldLongEnough}
      delayLongPress={minHoldMs}
      pressRetentionOffset={24}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            shadow,
            {
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              opacity: disabled ? 0.5 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
              transitionProperty: ["transform", "opacity"],
              transitionDuration: 120,
            },
          ]}
        >
          <LinearGradient
            colors={["#A3DC2F", "#2F80ED"]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={{
              flex: 1,
              borderRadius: SIZE / 2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isRecording ? (
              <LottieView
                source={LOTTIE_ANIMATIONS.voiceWave}
                loop
                autoPlay
                style={{ width: SIZE * 0.7, height: 40 }}
                resizeMode="contain"
              />
            ) : (
              <MaterialCommunityIcons name="microphone" size={52} color="white" />
            )}
          </LinearGradient>
        </Animated.View>
      )}
    </Pressable>
  );
}
