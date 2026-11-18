import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AiCoachAllowanceDto, formatResetDate } from "../models/ai-coach-allowance";

/** Takes the composer's place while the user's allowance, or everyone's monthly cap, is used up. */
export function AllowanceBlockedCard({ allowance, onCreateManually }: {
  allowance: AiCoachAllowanceDto;
  onCreateManually: () => void;
}) {
  const { t, i18n } = useTranslation("aiCoach");
  const date = formatResetDate(allowance.resetsOn, i18n.resolvedLanguage ?? i18n.language);
  return (
    <View className="rounded-[26px] bg-white px-[18px] py-4" style={{ boxShadow: "0 4px 16px rgba(68, 73, 100, 0.08)" }}
      accessibilityLiveRegion="polite">
      <Text className="font-baloo text-sm text-secondary">
        {allowance.state === "paused" ? t("chat.allowancePaused", { date }) : t("chat.allowanceExhausted", { date })}
      </Text>
      <Pressable className="bg-highlight rounded-2xl py-3 items-center mt-3" onPress={onCreateManually}
        accessibilityRole="button">
        <Text className="font-balooBold text-white text-sm">{t("chat.createManually")}</Text>
      </Pressable>
    </View>
  );
}
