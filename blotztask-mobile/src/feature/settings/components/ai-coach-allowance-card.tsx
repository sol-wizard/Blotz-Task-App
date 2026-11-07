import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAiCoachAllowance } from "@/feature/ai-coach/hooks/useAiCoachAllowance";
import { formatRemainingPercent, formatResetDate } from "@/feature/ai-coach/models/ai-coach-allowance";

/** The free monthly AI Coach allowance as a percentage — never dollars or tokens. */
export function AiCoachAllowanceCard() {
  const { allowance } = useAiCoachAllowance();
  const { t, i18n } = useTranslation("settings");
  if (!allowance) return null;

  const resetDate = formatResetDate(allowance.resetsOn, i18n.resolvedLanguage ?? i18n.language);
  // Paused keeps the user's own percentage, but grays the bar: nothing is usable until the reset.
  const barColor = allowance.state === "exhausted" || allowance.state === "paused" ? "bg-gray-300"
    : allowance.state === "low" ? "bg-amber-500" : "bg-[#9AD513]";
  const note = allowance.state === "exhausted" ? t("CoachAllowance.exhausted", { date: resetDate })
    : allowance.state === "paused" ? t("CoachAllowance.paused", { date: resetDate })
      : t("CoachAllowance.resets", { date: resetDate });

  return (
    <View className="mx-6 mt-4 rounded-2xl bg-white px-6 py-6">
      <View className="flex-row items-center gap-2 mb-1">
        <Text className="text-lg text-[#9AD513]">✦</Text>
        <Text className="text-xl font-balooExtraBold text-secondary">{t("CoachAllowance.title")}</Text>
      </View>
      <Text className="text-xs font-baloo text-gray-400 mb-4">{t("CoachAllowance.subtitle")}</Text>

      <View className="flex-row justify-between items-baseline mb-2">
        <Text className="text-sm font-baloo text-gray-600">{t("CoachAllowance.remaining")}</Text>
        <Text className="text-sm font-balooBold text-secondary">{formatRemainingPercent(allowance)}</Text>
      </View>
      <View
        className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: allowance.remainingPercent }}
      >
        <View className={`h-full rounded-full ${barColor}`} style={{ width: `${allowance.remainingPercent}%` }} />
      </View>
      <Text className="text-xs font-baloo text-gray-400">{note}</Text>
    </View>
  );
}
