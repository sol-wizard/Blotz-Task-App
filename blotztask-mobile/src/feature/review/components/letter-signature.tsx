import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { PNGIMAGES } from "@/shared/constants/assets";

export function LetterSignature() {
  const { t } = useTranslation("settings");

  return (
    <>
      <View className="relative">
        <View>
          <Text className="text-sm font-baloo text-secondary/60 italic">{t("review.signOff")}</Text>

          <Text className="text-2xl font-balooBold text-secondary mt-1">
            {t("review.signature")}
          </Text>
        </View>

        <Image
          source={PNGIMAGES.letterStamp}
          style={{
            position: "absolute",
            width: 320,
            height: 480,
            right: -60,
            bottom: -220,
          }}
          contentFit="contain"
        />
      </View>
    </>
  );
}
