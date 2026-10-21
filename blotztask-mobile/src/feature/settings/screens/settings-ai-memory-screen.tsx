import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "@/shared/components/return-button";
import { ToggleSwitch } from "@/feature/settings/components/toggle-switch";
import LoadingScreen from "@/shared/components/loading-screen";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { useClearUserMemoriesMutation } from "@/feature/settings/hooks/useClearUserMemoriesMutation";

export default function SettingsAiMemoryScreen() {
  const { t } = useTranslation("settings");
  const { isUserPreferencesLoading, userPreferences } = useUserPreferencesQuery();
  const { updateUserPreferences, isUpdatingUserPreferences } = useUserPreferencesMutation();
  const { clearUserMemories, isClearingUserMemories } = useClearUserMemoriesMutation();

  // Users without a stored value have memory on, matching the API default.
  const isMemoryEnabled = userPreferences?.aiMemoryEnabled ?? true;

  const setMemoryEnabled = (aiMemoryEnabled: boolean) => {
    if (!userPreferences) return;
    updateUserPreferences({ ...userPreferences, aiMemoryEnabled });
  };

  const handleToggleMemory = () => {
    if (!isMemoryEnabled) {
      setMemoryEnabled(true);
      return;
    }
    // Switching off asks whether to keep what was remembered, so turning it back on can restore it.
    Alert.alert(t("aiMemory.turnOffTitle"), t("aiMemory.turnOffDescription"), [
      { text: t("aiMemory.cancel"), style: "cancel" },
      { text: t("aiMemory.keepAndTurnOff"), onPress: () => setMemoryEnabled(false) },
      {
        text: t("aiMemory.deleteAndTurnOff"),
        style: "destructive",
        onPress: () => clearUserMemories(undefined, { onSuccess: () => setMemoryEnabled(false) }),
      },
    ]);
  };

  if (isUserPreferencesLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">{t("aiMemory.title")}</Text>
        </View>
      </View>

      <View className="mx-6 mt-8 rounded-2xl bg-white px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-balooBold text-secondary">{t("aiMemory.toggleLabel")}</Text>
          <ToggleSwitch
            value={isMemoryEnabled}
            disabled={isUpdatingUserPreferences || isClearingUserMemories}
            onChange={handleToggleMemory}
          />
        </View>
        <Text className="mt-1 text-sm font-baloo text-gray-500">
          {isMemoryEnabled ? t("aiMemory.toggleDescription") : t("aiMemory.offNotice")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
