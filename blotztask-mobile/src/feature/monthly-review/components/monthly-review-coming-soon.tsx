import { Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
export function MonthlyReviewComingSoon() {
  const { t } = useTranslation("settings");

  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-white">
        <MaterialCommunityIcons name="email-outline" size={36} color="#9AD513" />
      </View>
      <Text className="mb-2 text-center text-xl font-balooBold text-secondary">
        {t("monthlyReview.comingSoonTitle")}
      </Text>
      <Text className="text-center text-base font-baloo leading-6 text-secondary/70">
        {t("monthlyReview.comingSoonBody")}
      </Text>
    </View>
  );
}
