import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";

// The AI sheet sits on a gradient; the feedback screen sits on the light page background.
const VARIANT_STYLES = {
  onGradient: {
    iconColor: "rgba(255,255,255,0.7)",
    text: "text-white/70",
    button: "bg-white/25",
    buttonText: "text-white",
  },
  onLight: {
    iconColor: "#8C8FA3",
    text: "text-secondary/70",
    button: "bg-white",
    buttonText: "text-secondary",
  },
};

type Props = {
  /** States the reason instead of the workaround, so a tap the OS ignores still gets an answer. */
  showDisabledReason: boolean;
  /** Blocked users cannot be prompted again, so they need a route into system settings. */
  showSettingsButton: boolean;
  onOpenSettings: () => void;
  variant?: keyof typeof VARIANT_STYLES;
};

export function MicPermissionHint({
  showDisabledReason,
  showSettingsButton,
  onOpenSettings,
  variant = "onGradient",
}: Props) {
  const { t } = useTranslation("aiTaskGenerate");
  const styles = VARIANT_STYLES[variant];

  return (
    <View className="w-full flex-row items-center justify-center gap-2 px-6 pb-3">
      <MaterialCommunityIcons name="microphone-off" size={16} color={styles.iconColor} />
      <Text className={`${styles.text} font-baloo text-[13px]`}>
        {showDisabledReason ? t("permission.micDisabled") : t("permission.typeInstead")}
      </Text>

      {showSettingsButton && (
        <Pressable
          onPress={onOpenSettings}
          accessibilityRole="button"
          className={`rounded-full ${styles.button} px-3 py-1`}
        >
          <Text className={`${styles.buttonText} font-balooBold text-[13px]`}>
            {t("permission.openSettings")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
