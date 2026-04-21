import { View, Text, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";

type Props = {
  storeUrl: string;
};

export function UpdateRequiredOverlay({ storeUrl }: Props) {
  const { t } = useTranslation("common");

  const openStore = () => {
    if (storeUrl) void Linking.openURL(storeUrl);
  };

  return (
    <View className="absolute inset-0 bg-background z-50">
      <SafeAreaView className="flex-1 items-center justify-center px-10">
        <Image
          source={ASSETS.greenBun}
          className="w-36 h-36 mb-6"
          contentFit="contain"
        />

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
          <Text className="font-balooBold text-white text-base">
            {t("update.button")}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
