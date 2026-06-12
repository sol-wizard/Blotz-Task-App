import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ReviewPeriodType } from "../models/monthly-review-dto";

export type ReviewTab = ReviewPeriodType;

type Props = {
  activeTab: ReviewTab;
  onChange: (tab: ReviewTab) => void;
};

export function ReviewTabs({ activeTab, onChange }: Props) {
  const { t } = useTranslation("settings");

  const tabs: { key: ReviewTab; label: string }[] = [
    { key: ReviewPeriodType.Weekly, label: t("review.weeklyTab") },
    { key: ReviewPeriodType.Monthly, label: t("review.monthlyTab") },
  ];

  return (
    <View className="flex-row rounded-full bg-white p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className={`flex-1 items-center justify-center rounded-full py-2 ${
              isActive ? "bg-secondary" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-sm font-balooBold ${
                isActive ? "text-white" : "text-secondary/60"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
