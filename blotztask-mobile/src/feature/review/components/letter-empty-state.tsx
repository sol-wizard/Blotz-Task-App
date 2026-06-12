import { Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { ReviewPeriodType } from "../models/review-dto";

type Props = {
  // Defaults to the monthly copy; weekly passes ReviewPeriodType.Weekly.
  period?: ReviewPeriodType;
};

export function LetterEmptyState({ period = ReviewPeriodType.Monthly }: Props) {
  const { t } = useTranslation("settings");
  const ns = period === ReviewPeriodType.Weekly ? "weeklyReview" : "monthlyReview";

  return (
    <View className="py-12 items-center">
      <MaterialCommunityIcons name="email-outline" size={40} color="#8C8C8C" />
      <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
        {t(`${ns}.empty`)}
      </Text>
      <Text className="text-sm font-baloo text-secondary/50 mt-1 text-center">
        {t(`${ns}.emptyHint`)}
      </Text>
    </View>
  );
}
