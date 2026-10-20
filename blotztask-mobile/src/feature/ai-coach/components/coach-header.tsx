import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { ASSETS } from "@/shared/constants/assets";
import { GradientCircle } from "@/shared/components/gradient-circle";

/** The coach's own mark, shared by the header and the welcome state. */
export function CoachMark({ size = 34 }: { size?: number }) {
  return (
    <GradientCircle size={size}>
      <ASSETS.whiteBun width={size * 0.58} height={size * 0.58} style={{ position: "absolute" } as const} />
    </GradientCircle>
  );
}

/** Back, who you are talking to and what it is doing, then topic actions. */
export function CoachHeader({ status, actionsDisabled, onBack, onNewTopic, onMenu }: {
  status: "idle" | "thinking" | "listening";
  actionsDisabled: boolean;
  onBack: () => void;
  onNewTopic: () => void;
  onMenu: () => void;
}) {
  const { t } = useTranslation("aiCoach");
  const statusText = status === "thinking" ? t("chat.thinking")
    : status === "listening" ? t("chat.listening") : t("chat.status");
  return (
    <View className="flex-row items-center gap-2 px-3 pt-1.5 pb-2 border-b border-[#E8ECEF]">
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t("chat.back")} hitSlop={6}
        className="w-10 h-10 items-center justify-center">
        <Ionicons name="chevron-back" size={24} color="#444964" />
      </Pressable>
      <CoachMark />
      <View className="flex-1">
        <Text className="font-balooBold text-[17px] leading-[24px] text-secondary">{t("chat.title")}</Text>
        <View className="flex-row items-center gap-1.5" accessibilityLiveRegion="polite">
          <View className="w-1.5 h-1.5 rounded-full bg-checked" />
          <Text className={`font-inter text-xs ${status === "idle" ? "text-[#6B7280]" : "text-[#4D7300]"}`} numberOfLines={1}>
            {statusText}
          </Text>
        </View>
      </View>
      <Pressable onPress={onNewTopic} disabled={actionsDisabled} accessibilityRole="button"
        accessibilityLabel={t("chat.newTopic")} accessibilityState={{ disabled: actionsDisabled }}
        className={`w-10 h-10 rounded-full bg-white items-center justify-center ${actionsDisabled ? "opacity-40" : ""}`}>
        <Ionicons name="create-outline" size={20} color="#444964" />
      </Pressable>
      <Pressable onPress={onMenu} disabled={actionsDisabled} accessibilityRole="button"
        accessibilityLabel={t("chat.menu")} accessibilityState={{ disabled: actionsDisabled }}
        className={`w-10 h-10 rounded-full bg-white items-center justify-center ${actionsDisabled ? "opacity-40" : ""}`}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#444964" />
      </Pressable>
    </View>
  );
}
