import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { ReviewPeriodType } from "../models/review-dto";

type Props = {
  period: ReviewPeriodType;
  periodName: string;
  onRead: () => void;
};

export function LetterReadyState({ period, periodName, onRead }: Props) {
  const { t } = useTranslation("settings");

  const ns = period === ReviewPeriodType.Weekly ? "weeklyReview" : "monthlyReview";

  return (
    <View className="items-center pt-4 pb-4">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-white">
        <MaterialCommunityIcons name="email-outline" size={36} color="#9AD513" />
      </View>
      <Text className="mt-4 text-center text-base font-balooBold text-secondary">
        {t(`${ns}.readyTitle`, { period: periodName })}
      </Text>

      <Pressable onPress={onRead} className="mt-12 rounded-full bg-highlight px-6 py-3">
        <Text className="font-balooBold text-white">{t(`${ns}.readLetter`)}</Text>
      </Pressable>
    </View>
  );
}
