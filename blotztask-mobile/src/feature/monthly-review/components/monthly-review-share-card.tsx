import { Text, View, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { PNGIMAGES } from "@/shared/constants/assets";

type Props = {
  displayMonth: string;
  recipientName: string;
  body: string;
};

const MAX_EXCERPT_LENGTH = 520;

const createExcerpt = (body: string) => {
  const normalizedBody = body.replace(/\s+/g, " ").trim();

  if (normalizedBody.length <= MAX_EXCERPT_LENGTH) {
    return normalizedBody;
  }

  return `${normalizedBody.slice(0, MAX_EXCERPT_LENGTH).trim()}...`;
};

export function MonthlyReviewShareCard({ displayMonth, recipientName, body }: Props) {
  const { t } = useTranslation("settings");
  const excerpt = createExcerpt(body);

  return (
    <View
      collapsable={false}
      className="h-[640px] w-[360px] bg-[#FFFBF3] px-7 pb-7 pt-[30px]"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white">
            <Image
              source={PNGIMAGES.blotzIcon}
              className="h-[30px] w-[30px]"
              resizeMode="contain"
            />
          </View>
          <View className="ml-3">
            <Text className="font-baloo text-[10px] text-[#363853]/55">
              {t("monthlyReview.shareCard.label")}
            </Text>
            <Text className="font-balooBold text-base text-[#363853]">Blotz</Text>
          </View>
        </View>
        <Text className="font-balooBold text-[15px] text-[#363853]">{displayMonth}</Text>
      </View>

      <View className="my-6 h-px bg-[#363853]/10" />

      <Text className="font-balooBold text-[30px] leading-9 text-[#363853]">
        {t("monthlyReview.shareCard.title")}
      </Text>
      <Text className="mt-2.5 font-baloo text-[15px] leading-[22px] text-[#363853]/70">
        {t("monthlyReview.greeting", { name: recipientName })}
      </Text>

      <View className="mt-6 rounded-[22px] bg-white px-[22px] py-[22px]">
        <Text
          numberOfLines={12}
          ellipsizeMode="tail"
          className="font-baloo text-base leading-[25px] text-[#363853]"
        >
          {excerpt}
        </Text>
      </View>

      <View className="flex-1" />

      <View className="mt-[26px] flex-row items-center justify-end">
        <Image
          source={PNGIMAGES.successBun}
          className="h-16 w-16"
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
