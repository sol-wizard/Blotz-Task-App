import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { PNGIMAGES } from "@/shared/constants/assets";

type Props = { displayMonth: string };

export function LetterHeader({ displayMonth }: Props) {
  const { t } = useTranslation("settings");

  return (
    <>
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center">
          <View
            className="w-9 h-9 rounded-full items-center justify-center bg-white"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <Image
              source={PNGIMAGES.blotzIcon}
              style={{ width: 26, height: 26 }}
              contentFit="contain"
            />
          </View>
          <View className="ml-3">
            <Text className="text-[10px] font-baloo text-secondary/50 uppercase tracking-[2px]">
              {t("monthlyReview.letterLabel")}
            </Text>
            <Text className="text-sm font-balooBold text-secondary">Blotz</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[10px] font-baloo text-secondary/50 uppercase tracking-[2px]">
            {t("monthlyReview.dateLabel")}
          </Text>
          <Text className="text-sm font-balooBold text-secondary">{displayMonth}</Text>
        </View>
      </View>
      <View className="h-px bg-secondary/10 mb-6" />
    </>
  );
}
