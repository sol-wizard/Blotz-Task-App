import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View, Pressable } from "react-native";
import { ReturnButton } from "@/shared/components/return-button";
import { useAiUsageSummaryQuery } from "@/feature/settings/hooks/useAiUsageSummaryQuery";
import LoadingScreen from "@/shared/components/loading-screen";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { ToggleSwitch } from "@/feature/settings/components/toggle-switch";

export default function AiUsageScreen() {
  const { aiUsageSummary, isAiUsageSummaryLoading } = useAiUsageSummaryQuery();
  const [showProgress, setShowProgress] = useState(false);
  const { t, i18n } = useTranslation("settings");

  const formatPeriodLabel = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const locale = i18n.language === "zh" ? "zh-CN" : "en-US";

    if (i18n.language === "zh") {
      // CN: 4月1日 - 4月30日
      return `${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${
        endDate.getMonth() + 1
      }月${endDate.getDate()}日`;
    } else {
      // EN: Apr 1 - Apr 30
      const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
      return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
    }
  };

  const periodLabel = useMemo(() => {
    if (!aiUsageSummary) return "";
    return formatPeriodLabel(aiUsageSummary.periodStartDate, aiUsageSummary.periodEndDate);
  }, [aiUsageSummary?.periodStartDate, aiUsageSummary?.periodEndDate, i18n.language]);

  if (isAiUsageSummaryLoading) {
    return <LoadingScreen />;
  }

  if (!aiUsageSummary) return null;

  const percent =
    aiUsageSummary.totalLimit > 0
      ? Math.round((aiUsageSummary.usedTokens / aiUsageSummary.totalLimit) * 100)
      : 0;
  const barColor = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-[#9AD513]";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
      </View>

      <View className="mx-6 mt-8 rounded-2xl bg-white px-6 py-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg text-[#9AD513]">✦</Text>
            <Text className="text-xl font-balooExtraBold text-secondary">
              {t("MembershipPlan.plan")}
            </Text>
          </View>
          <View className="bg-[#E1F5EE] px-3 py-1 rounded-full">
            <Text className="text-sm font-balooBold text-[#9AD513]">{aiUsageSummary.planName}</Text>
          </View>
        </View>

        {/* Usage count */}
        <Pressable onPress={() => setShowProgress(!showProgress)}>
          <View className="mb-4">
            <Text className="text-4xl font-balooExtraBold text-[#9AD513] leading-tight">
              {aiUsageSummary.usedTokens.toLocaleString(i18n.language === "zh" ? "zh-CN" : "en-US")}
            </Text>
            <Text className="text-base font-baloo text-gray-500 mt-1">
              {t("MembershipPlan.completedLabel")}
            </Text>
          </View>
        </Pressable>

        {/* Motivational banner */}
        <View className="bg-[#F0FAF6] rounded-lg py-3 px-4 mb-4">
          <Text className="text-sm font-baloo text-[#9AD513] text-center">
            {t("MembershipPlan.banner")}
          </Text>
        </View>

        {/* Progress toggle */}
        <View className="flex-row items-center justify-between py-3">
          <View className="flex-1">
            <Text className="text-base font-baloo text-secondary">
              {t("MembershipPlan.showProgress")}
            </Text>
            <Text className="text-xs font-baloo text-gray-400 mt-0.5">
              {t("MembershipPlan.showProgressHint")}
            </Text>
          </View>
          <ToggleSwitch value={showProgress} onChange={() => setShowProgress(!showProgress)} />
        </View>

        {/* Progress bar */}
        {showProgress && (
          <View className="bg-gray-50 rounded-lg p-4 mt-2">
            <View className="flex-row justify-between items-baseline mb-2">
              <Text className="text-sm font-baloo text-gray-600">
                {t("MembershipPlan.usedQuota")}
              </Text>
              <Text className="text-sm font-baloo text-gray-500">
                {aiUsageSummary.usedTokens.toLocaleString(
                  i18n.language === "zh" ? "zh-CN" : "en-US",
                )}{" "}
                /{" "}
                {aiUsageSummary.totalLimit.toLocaleString(
                  i18n.language === "zh" ? "zh-CN" : "en-US",
                )}
              </Text>
            </View>

            <Text className="text-xs font-baloo text-gray-400 mb-2">
              {t("MembershipPlan.period")} {periodLabel}
            </Text>

            <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <View
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </View>

            <View className="flex-row justify-between">
              <Text className="text-xs font-baloo text-gray-400">{percent}%</Text>
              <Text className="text-xs font-baloo text-gray-400">
                {t("MembershipPlan.remaining")}{" "}
                {aiUsageSummary.remainingTokens.toLocaleString(
                  i18n.language === "zh" ? "zh-CN" : "en-US",
                )}
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
