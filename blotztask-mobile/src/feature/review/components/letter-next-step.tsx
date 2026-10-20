import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  suggestion: string;
};

export function LetterNextStep({ suggestion }: Props) {
  const { t } = useTranslation("settings");

  return (
    <View className="mb-8">
      <Text className="text-[15px] font-balooBold text-secondary mb-1">
        {t("monthlyReview.nextMonthTitle")}
      </Text>

      <Text className="text-[15px] font-baloo text-secondary" style={{ lineHeight: 26 }}>
        {suggestion}
      </Text>
    </View>
  );
}
