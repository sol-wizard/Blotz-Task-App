import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export function LetterEmptyState() {
  const { t } = useTranslation("settings");

  return (
    <View className="py-12 items-center">
      <MaterialCommunityIcons name="email-outline" size={40} color="#C7C9D6" />
      <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
        {t("monthlyReview.empty")}
      </Text>
    </View>
  );
}
