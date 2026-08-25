import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

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
      </View>
    </>
  );
}
