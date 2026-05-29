import { Text, View, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { PNGIMAGES } from "@/shared/constants/assets";

type Props = {
  displayMonth: string;
  recipientName: string;
  body: string;
};

export function MonthlyReviewShareCard({ displayMonth, recipientName, body }: Props) {
  const { t } = useTranslation("settings");

  return (
    <View collapsable={false} className="h-128 w-96 bg-[#FFFBF3] px-7 pb-7 pt-8">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
            <Image source={PNGIMAGES.blotzIcon} className="h-8 w-8" resizeMode="contain" />
          </View>

          <View className="ml-3">
            <Text className="font-baloo text-xs text-secondary/60">
              {t("monthlyReview.title")}
            </Text>
            <Text className="font-balooBold text-base text-secondary">Blotz</Text>
          </View>
        </View>

        <Text className="font-balooBold text-sm text-secondary">{displayMonth}</Text>
      </View>

      <View className="my-6 h-px bg-secondary/10" />

      <Text className="font-balooBold text-xl text-secondary">
        {t("monthlyReview.shareCard.title")}
      </Text>

      <Text className="mt-2 font-baloo text-base text-secondary/60">
        {t("monthlyReview.greeting", { name: recipientName })}
      </Text>

      <View className="mt-6 rounded-3xl px-6 py-6">
        <Text
          numberOfLines={16}
          ellipsizeMode="tail"
          className="font-baloo text-base leading-6 text-secondary"
        >
          {body}
        </Text>
      </View>

      <View className="flex-1" />

      <View className="mt-6 flex-row items-center justify-end">
        <Image source={PNGIMAGES.successBun} className="h-16 w-16" resizeMode="contain" />
      </View>
    </View>
  );
}
