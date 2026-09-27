import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";

type Props = {
  /** States the reason instead of the workaround, so a tap the OS ignores still gets an answer. */
  showDisabledReason: boolean;
  /** Blocked users cannot be prompted again, so they need a route into system settings. */
  showSettingsButton: boolean;
  onOpenSettings: () => void;
};

export function MicPermissionHint({
  showDisabledReason,
  showSettingsButton,
  onOpenSettings,
}: Props) {
  const { t } = useTranslation("aiTaskGenerate");

  return (
    <View className="w-full flex-row items-center justify-center gap-2 px-6 pb-3">
      <MaterialCommunityIcons name="microphone-off" size={16} color="rgba(255,255,255,0.7)" />
      <Text className="text-white/70 font-baloo text-[13px]">
        {showDisabledReason ? t("permission.micDisabled") : t("permission.typeInstead")}
      </Text>

      {showSettingsButton && (
        <Pressable
          onPress={onOpenSettings}
          accessibilityRole="button"
          className="rounded-full bg-white/25 px-3 py-1"
        >
          <Text className="text-white font-balooBold text-[13px]">
            {t("permission.openSettings")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
