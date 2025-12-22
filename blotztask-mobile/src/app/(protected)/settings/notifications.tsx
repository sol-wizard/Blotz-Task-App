import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { ToggleSwitch } from "@/feature/settings/components/toggle-switch";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import LoadingScreen from "@/shared/components/ui/loading-screen";

export default function NotificationScreen() {
  const { isUserPreferencesLoading, userPreferencesError, userPreferences } =
    useUserPreferencesQuery();

  const { updateUserPreferencesAsync, isUpdatingUserPreferences, updateUserPreferencesError } =
    useUserPreferencesMutation();

  const handleUpdateUserPreferences = async () => {
    if (!userPreferences) return;

    const newUpcomingNotification = !userPreferences.upcomingNotification;

    const newUserPreferences: UserPreferencesDTO = {
      autoRollover: userPreferences.autoRollover,
      upcomingNotification: newUpcomingNotification,
      overdueNotification: userPreferences.overdueNotification,
      dailyPlanningNotification: userPreferences.dailyPlanningNotification,
      eveningWrapUpNotification: userPreferences.eveningWrapUpNotification,
    };

    try {
      await updateUserPreferencesAsync(newUserPreferences);
    } catch (error) {
      console.log("Failed to updateUserPreferences:", error);
    }
  };

  if (isUserPreferencesLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">Notifications</Text>
        </View>
      </View>

      <View className="mx-6 mt-8 rounded-2xl bg-white px-6 pt-4">
        <Text className="text-xl font-balooExtraBold text-secondary">Task notifications</Text>

        <View className="mt-1">
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base font-baloo text-secondary">Upcoming due tasks</Text>
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
