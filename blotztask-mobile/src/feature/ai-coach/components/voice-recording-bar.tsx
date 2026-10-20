import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useTranslation } from "react-i18next";
import { MAX_RECORDING_MS } from "../hooks/useCoachVoiceInput";

const GREEN = "#9AD513";
const COUNTDOWN_MS = 10_000;
const BAR_DELAYS = [0, 180, 360, 90, 270];

const wave = {
  "0%": { transform: [{ scaleY: 0.25 }] },
  "50%": { transform: [{ scaleY: 1 }] },
  "100%": { transform: [{ scaleY: 0.25 }] },
};

const halo = {
  from: { transform: [{ scale: 0.9 }], opacity: 0.8 },
  to: { transform: [{ scale: 1.35 }], opacity: 0 },
};

export const pressStyle = (pressed: boolean) => ({
  transform: [{ scale: pressed ? 0.92 : 1 }],
  transitionProperty: "transform" as const,
  transitionDuration: 120,
});

const formatElapsed = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

type Props = {
  sending: boolean;
  elapsedMs: number;
  onCancel: () => void;
  onSend: () => void;
};

export function RoundButton({ onPress, disabled, label, children }: {
  onPress: () => void; disabled?: boolean; label: string; children: (pressed: boolean) => ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={4} pressRetentionOffset={16}
      accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => children(pressed)}
    </Pressable>
  );
}

/** The composer while the coach is listening: cancel, a live waveform and timer, then send. */
export function VoiceRecordingBar({ sending, elapsedMs, onCancel, onSend }: Props) {
  const { t } = useTranslation("aiCoach");
  const reducedMotion = useReducedMotion();
  const remainingMs = MAX_RECORDING_MS - elapsedMs;
  const countingDown = !sending && remainingMs <= COUNTDOWN_MS;

  return (
    <Animated.View entering={FadeIn.duration(180)} className="flex-row items-center gap-2.5 rounded-[26px] bg-white p-1.5"
      style={{ borderWidth: 1.5, borderColor: GREEN, boxShadow: "0 4px 16px rgba(68, 73, 100, 0.10)" }}>
      <RoundButton onPress={onCancel} disabled={sending} label={t("chat.cancelVoice")}>
        {(pressed) => (
          <Animated.View className="w-11 h-11 rounded-full items-center justify-center bg-[#F3F5F7]"
            style={pressStyle(pressed)}>
            <Ionicons name="close" size={20} color={sending ? "#C4C4C4" : "#444964"} />
          </Animated.View>
        )}
      </RoundButton>

      <View className="flex-row items-center gap-[3px] h-5" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {BAR_DELAYS.map((delay) => (
          <Animated.View key={delay} className="w-[3px] h-5 rounded-full"
            style={sending || reducedMotion
              ? { backgroundColor: GREEN, opacity: 0.45, transform: [{ scaleY: 0.3 }] }
              : {
                backgroundColor: GREEN,
                animationName: wave,
                animationDuration: "900ms",
                animationDelay: delay,
                animationIterationCount: "infinite",
                animationTimingFunction: "ease-in-out",
              }} />
        ))}
      </View>

      <View className="flex-1" accessibilityLiveRegion="polite">
        {sending ? (
          <Text className="font-baloo text-base text-[#4D7300]">{t("chat.transcribing")}</Text>
        ) : countingDown ? (
          <Text className="font-baloo text-base text-[#C2410C]" numberOfLines={1}>
            {t("chat.autoSendIn", { count: Math.max(1, Math.ceil(remainingMs / 1000)) })}
          </Text>
        ) : (
          <View className="flex-row items-baseline gap-2">
            <Text className="font-baloo text-base text-[#4D7300]">{t("chat.listening")}</Text>
            <Text className="font-baloo text-base text-secondary" style={{ fontVariant: ["tabular-nums"] }}>
              {formatElapsed(elapsedMs)}
            </Text>
          </View>
        )}
      </View>

      <RoundButton onPress={onSend} disabled={sending} label={t("chat.stopAndSend")}>
        {(pressed) => (
          <View className="w-11 h-11 items-center justify-center">
            {!sending && !reducedMotion && (
              <Animated.View className="absolute w-11 h-11 rounded-full"
                style={{
                  borderWidth: 2,
                  borderColor: GREEN,
                  animationName: halo,
                  animationDuration: "1600ms",
                  animationIterationCount: "infinite",
                  animationTimingFunction: "ease-out",
                }} />
            )}
            <Animated.View className="w-11 h-11 rounded-full items-center justify-center bg-highlight"
              style={pressStyle(pressed)}>
              {sending
                ? <ActivityIndicator size="small" color="#2F3347" />
                : <Ionicons name="arrow-up" size={22} color="#2F3347" />}
            </Animated.View>
          </View>
        )}
      </RoundButton>
    </Animated.View>
  );
}
