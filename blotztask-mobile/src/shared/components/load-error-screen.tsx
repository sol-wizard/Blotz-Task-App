import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";
import { useLogout } from "@/shared/hooks/useLogout";

type Props = {
  onRetry: () => void;
  isRetrying?: boolean;
};

/**
 * Shown when the requests that gate the app after login fail. Without it the user sits on
 * a spinner forever, with no way to retry and no way out short of reinstalling.
 */
export function LoadErrorScreen({ onRetry, isRetrying = false }: Props) {
  const { t } = useTranslation("common");
  const logout = useLogout();

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1 items-center justify-center px-10">
        <Image source={ASSETS.greenBun} className="w-36 h-36 mb-6" contentFit="contain" />

        <Text className="font-balooExtraBold text-2xl text-center text-secondary mb-3">
          {t("errors.loadFailed")}
        </Text>

        <Text className="font-baloo text-base text-center text-primary leading-6 mb-8">
          {t("errors.default")}
        </Text>

        <Pressable
          onPress={onRetry}
          disabled={isRetrying}
          className="bg-highlight rounded-2xl px-10 py-4 active:opacity-80"
          style={{ opacity: isRetrying ? 0.6 : 1 }}
        >
          <Text className="font-balooBold text-white text-base">{t("buttons.retry")}</Text>
        </Pressable>

        <Pressable onPress={() => void logout()} className="mt-4 px-6 py-3 active:opacity-60">
          <Text className="font-baloo text-secondary text-base">{t("buttons.signOut")}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
