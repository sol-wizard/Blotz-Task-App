import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ReviewPeriodType } from "../models/review-dto";
import { Image } from "expo-image";
import { PNGIMAGES } from "@/shared/constants/assets";

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
      <Image
        source={PNGIMAGES.letterReadyToOpen}
        style={{ width: 72, height: 72 }}
        contentFit="contain"
      />
      <Text className="mt-2 text-center text-base font-balooBold text-secondary">
        {t(`${ns}.readyTitle`, { periodLabel: periodName })}
      </Text>

      <Pressable onPress={onRead} className="mt-16 rounded-full bg-highlight px-6 py-3">
        <Text className="font-balooBold text-white">{t(`${ns}.readLetter`)}</Text>
      </Pressable>
      <Image
        source={PNGIMAGES.letterStamp}
        style={{
          position: "absolute",
          width: 300,
          height: 360,
          right: -70,
          bottom: -140,
        }}
        contentFit="contain"
      />
    </View>
  );
}
