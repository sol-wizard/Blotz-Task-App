import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { PNGIMAGES } from "@/shared/constants/assets";
import { FormDivider } from "@/shared/components/form-divider";

export function LetterSignature() {
  const { t } = useTranslation("settings");

  return (
    <>
      <View className="flex-row justify-center mb-6">
        <FormDivider />
      </View>
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-sm font-baloo text-secondary/60 italic">
            {t("monthlyReview.signOff")}
          </Text>
          <Text className="text-2xl font-balooBold text-secondary mt-1">
            {t("monthlyReview.signature")}
          </Text>
        </View>
        <View
          className="w-14 h-14 rounded-full items-center justify-center bg-white"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Image
            source={PNGIMAGES.blotzIcon}
            style={{ width: 40, height: 40 }}
            contentFit="contain"
          />
        </View>
      </View>
    </>
  );
}
