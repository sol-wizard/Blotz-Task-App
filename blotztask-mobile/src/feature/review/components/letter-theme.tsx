import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  theme: string;
};

export function LetterTheme({ theme }: Props) {
  const { t } = useTranslation("settings");

  return (
    <View className="mb-5">
      <Text className="text-[10px] font-baloo text-secondary/50 uppercase tracking-[2px] mb-1.5">
        {t("monthlyReview.themeLabel")}
      </Text>

      <Text className="text-base font-balooBold text-secondary">{theme}</Text>
    </View>
  );
}
