import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { ToggleSwitch } from "@/feature/settings/components/toggle-switch";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import LoadingScreen from "@/shared/components/ui/loading-screen";

export default function TaskHandlingScreen() {
  const { isUserPreferencesLoading, userPreferences } = useUserPreferencesQuery();
  const { updateUserPreferences, isUpdatingUserPreferences } = useUserPreferencesMutation();
  const handleToggleAutoRollover = async () => {
    if (!userPreferences) return;
    const newUserPreferences: UserPreferencesDTO = {
      autoRollover: !userPreferences.autoRollover,
      upcomingNotification: userPreferences.upcomingNotification,
      overdueNotification: userPreferences.overdueNotification,
      dailyPlanningNotification: userPreferences.dailyPlanningNotification,
      eveningWrapUpNotification: userPreferences.eveningWrapUpNotification,
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
          <Text className="text-3xl font-balooExtraBold text-secondary">Task Handling</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between bg-white rounded-2xl px-6 py-4 mt-8 mx-6">
        <View className="flex-1 mr-4">
          <Text className="text-lg font-baloo text-secondary">Auto Rollover</Text>
          <Text className="text-sm text-primary font-balooThin mt-1">
            Move overdue tasks to today automatically.
          </Text>
        </View>

        {/* <ToggleSwitch value={isAutoRolloverEnabled} onChange={toggleAutoRollover} /> */}
        <ToggleSwitch
          value={userPreferences?.autoRollover ?? false}
          disabled={isUpdatingUserPreferences}
          onChange={handleToggleAutoRollover}
        />
      </View>
    </SafeAreaView>
  );
}
