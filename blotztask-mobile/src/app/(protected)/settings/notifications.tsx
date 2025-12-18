import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { ToggleSwitch } from "@/feature/settings/components/toggle-switch";
import { FormDivider } from "@/shared/components/ui/form-divider";

export default function NotificationScreen() {
  const [upcomingDueTasks, setUpcomingDueTasks] = useState(true);
  const [overdueTaskAlerts, setOverdueTaskAlerts] = useState(true);
  const [dailyPlanningReminder, setDailyPlanningReminder] = useState(false);
  const [eveningWrapUpReminder, setEveningWrapUpReminder] = useState(false);

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
              value={upcomingDueTasks}
              onChange={() => setUpcomingDueTasks((prev) => !prev)}
            />
          </View>

          <FormDivider marginVertical={1} />

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base font-baloo text-secondary">Overdue task alerts</Text>
            <ToggleSwitch
              value={overdueTaskAlerts}
              onChange={() => setOverdueTaskAlerts((prev) => !prev)}
            />
          </View>

          <FormDivider marginVertical={1} />

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base font-baloo text-secondary">Daily planning reminder</Text>
            <ToggleSwitch
              value={dailyPlanningReminder}
              onChange={() => setDailyPlanningReminder((prev) => !prev)}
            />
          </View>

          <FormDivider marginVertical={1} />

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base font-baloo text-secondary">Evening wrap-up reminder</Text>
            <ToggleSwitch
              value={eveningWrapUpReminder}
              onChange={() => setEveningWrapUpReminder((prev) => !prev)}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
