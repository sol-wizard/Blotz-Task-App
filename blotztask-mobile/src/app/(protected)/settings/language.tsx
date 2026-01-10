import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { Language, UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import LoadingScreen from "@/shared/components/ui/loading-screen";

export default function LanguageScreen() {
  const router = useRouter();
  const { i18n, t } = useTranslation("settings");
  const { isUserPreferencesLoading, userPreferences } = useUserPreferencesQuery();
  const { updateUserPreferences, isUpdatingUserPreferences } = useUserPreferencesMutation();

  const handleLanguageChange = async (language: Language) => {
    if (!userPreferences) return;

    // Update UI immediately
    const i18nLang = language === Language.En ? "en" : "zh";
    await i18n.changeLanguage(i18nLang);

    // Update backend
    const newUserPreferences: UserPreferencesDTO = {
      autoRollover: userPreferences.autoRollover,
      upcomingNotification: userPreferences.upcomingNotification,
      overdueNotification: userPreferences.overdueNotification,
      dailyPlanningNotification: userPreferences.dailyPlanningNotification,
      eveningWrapUpNotification: userPreferences.eveningWrapUpNotification,
      preferredLanguage: language,
    };

    try {
      await updateUserPreferences(newUserPreferences);
      console.log(`Language updated to: ${language}`);
    } catch (error) {
      console.log("Failed to update language:", error);
    }
  };

  if (isUserPreferencesLoading) {
    return <LoadingScreen />;
  }

  const currentLanguage = userPreferences?.preferredLanguage || Language.En;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#363853" />
        </Pressable>
        <Text className="text-2xl font-balooBold text-secondary">{t("language.title")}</Text>
      </View>

      {/* Language Options */}
      <View className="px-5 mt-4">
        <View className="bg-white rounded-2xl overflow-hidden">
          {/* English Option */}
          <Pressable
            onPress={() => handleLanguageChange(Language.En)}
            disabled={isUpdatingUserPreferences}
            className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
                <Text className="text-xl">🇺🇸</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-baloo text-secondary">{t("language.english")}</Text>
                <Text className="text-sm font-baloo text-gray-500">
                  {t("language.englishDescription")}
                </Text>
              </View>
            </View>
            {currentLanguage === Language.En && (
              <MaterialCommunityIcons name="check-circle" size={24} color="#4F46E5" />
            )}
          </Pressable>

          {/* Chinese Option */}
          <Pressable
            onPress={() => handleLanguageChange(Language.Zh)}
            disabled={isUpdatingUserPreferences}
            className="flex-row items-center justify-between px-6 py-4"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4">
                <Text className="text-xl">🇨🇳</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-baloo text-secondary">{t("language.chinese")}</Text>
                <Text className="text-sm font-baloo text-gray-500">
                  {t("language.chineseDescription")}
                </Text>
              </View>
            </View>
            {currentLanguage === Language.Zh && (
              <MaterialCommunityIcons name="check-circle" size={24} color="#4F46E5" />
            )}
          </Pressable>
        </View>

        {/* Info Text */}
        <Text className="text-sm font-baloo text-gray-500 mt-4 px-2">
          {currentLanguage === Language.En ? t("language.infoText") : t("language.infoTextChinese")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
