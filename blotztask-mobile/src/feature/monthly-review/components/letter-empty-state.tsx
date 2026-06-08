import { Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
export function LetterEmptyState() {
  const { t } = useTranslation("settings");

  return (
    <View className="py-12 items-center">
      <MaterialCommunityIcons name="email-outline" size={40} color="#8C8C8C" />
      <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
        {t("monthlyReview.empty")}
      </Text>
      <Text className="text-sm font-baloo text-secondary/50 mt-1 text-center">
        {t("monthlyReview.emptyHint")}
      </Text>
    </View>
  );
}
