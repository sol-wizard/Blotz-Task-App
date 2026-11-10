import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { AiCoachAllowanceDto, formatRemainingPercent } from "../models/ai-coach-allowance";
import { RoundButton, pressStyle } from "./voice-recording-bar";

/** Back on the left, topic actions on the right. The chat itself shows when the coach is thinking. */
export function CoachHeader({ actionsDisabled, allowance, onAllowancePress, onBack, onNewTopic, onMenu }: {
  actionsDisabled: boolean;
  /** Shown only once it runs low; plenty left stays out of the way. */
  allowance?: AiCoachAllowanceDto;
  onAllowancePress: () => void;
  onBack: () => void;
  onNewTopic: () => void;
  onMenu: () => void;
}) {
  const { t } = useTranslation("aiCoach");
  return (
    <View className="flex-row items-center gap-2 px-3 pt-1.5 pb-2">
      {/* The design's "‹ Tasks" pill. Like before, it goes back to the screen the coach was opened from. */}
      <RoundButton onPress={onBack} label={t("chat.backToTasks")}>
        {(pressed) => (
          <Animated.View style={pressStyle(pressed)}
            className="h-11 flex-row items-center gap-0.5 rounded-full bg-white pl-2.5 pr-4">
            <Ionicons name="chevron-back" size={20} color="#444964" />
            <Text className="font-baloo text-base text-secondary">{t("chat.tasks")}</Text>
          </Animated.View>
        )}
      </RoundButton>
      <View className="flex-1" />
      {allowance?.state === "low" && (
        <Pressable onPress={onAllowancePress} accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} className="rounded-full bg-[#FFF7ED] px-2.5 py-1">
          <Text className="font-balooBold text-xs text-[#C2410C]">
            {t("chat.allowanceLow", { percent: formatRemainingPercent(allowance) })}
          </Text>
        </Pressable>
      )}
      <HeaderButton icon="create-outline" label={t("chat.newTopic")} disabled={actionsDisabled} onPress={onNewTopic} />
      <HeaderButton icon="ellipsis-horizontal" label={t("chat.menu")} disabled={actionsDisabled} onPress={onMenu} />
    </View>
  );
}

/** A 44 pt round white button: the smallest tap area Apple recommends. */
function HeaderButton({ icon, label, disabled = false, onPress }: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <RoundButton onPress={onPress} disabled={disabled} label={label}>
      {(pressed) => (
        <Animated.View style={pressStyle(pressed)}
          className={`w-11 h-11 rounded-full bg-white items-center justify-center ${disabled ? "opacity-40" : ""}`}>
          <Ionicons name={icon} size={22} color="#444964" />
        </Animated.View>
      )}
    </RoundButton>
  );
}
