import { View, Text, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";
import { useRouter } from "expo-router";

type Props = {
  storeUrl: string;
  forced: boolean;
};

export function UpdateRequiredScreen({ storeUrl, forced }: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const skip = () => {
    router.back();
  };
  const openStore = () => {
    if (storeUrl) void Linking.openURL(storeUrl);
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1 items-center justify-center px-10">
        <Image source={ASSETS.greenBun} className="w-36 h-36 mb-6" contentFit="contain" />

        <Text className="font-balooExtraBold text-3xl text-center text-secondary mb-3">
          {t("update.title")}
        </Text>

        <Text className="font-baloo text-base text-center text-primary leading-6 mb-8">
          {t("update.message")}
        </Text>

        <Pressable
          onPress={openStore}
          className="bg-highlight rounded-2xl px-10 py-4 active:opacity-80"
        >
          <Text className="font-balooBold text-white text-base">{t("update.button")}</Text>
        </Pressable>
        {!forced && (
          <Pressable onPress={skip} className="mt-4 active:opacity-60">
            <Text className="font-baloo text-sm text-primary">{t("update.skip")}</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}
