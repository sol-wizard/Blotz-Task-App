import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { ToggleSwitch } from "@/feature/settings/components/toggle-switch";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { useTranslation } from "react-i18next";

export default function SettingsNotificationsScreen() {
  const { isUserPreferencesLoading, userPreferences } = useUserPreferencesQuery();
  const { updateUserPreferences, isUpdatingUserPreferences } = useUserPreferencesMutation();
  const { t } = useTranslation("settings");

  const handleUpdateUserPreferences = async () => {
    if (!userPreferences) return;

    const newUpcomingNotification = !userPreferences.upcomingNotification;

    const newUserPreferences: UserPreferencesDTO = {
      autoRollover: userPreferences.autoRollover,
      upcomingNotification: newUpcomingNotification,
      overdueNotification: userPreferences.overdueNotification,
      dailyPlanningNotification: userPreferences.dailyPlanningNotification,
      eveningWrapUpNotification: userPreferences.eveningWrapUpNotification,
      preferredLanguage: userPreferences.preferredLanguage,
    };

    updateUserPreferences(newUserPreferences);
  };

  if (isUserPreferencesLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">
            {t("notifications.title")}
          </Text>
        </View>
      </View>

      <View className="mx-6 mt-8 rounded-2xl bg-white px-6 pt-4">
        <Text className="text-xl font-balooExtraBold text-secondary">
          {t("notifications.taskNotifications")}
        </Text>

        <View className="mt-1">
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base font-baloo text-secondary">
              {t("notifications.upcomingDueTasks")}
            </Text>
            <ToggleSwitch
              value={userPreferences?.upcomingNotification ?? true}
              disabled={isUpdatingUserPreferences}
              onChange={() => handleUpdateUserPreferences()}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
