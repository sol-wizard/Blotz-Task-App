import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { reloadAppAsync } from "expo";
import i18next from "i18next";
import { ASSETS } from "@/shared/constants/assets";

export function CrashScreen() {
  const handleReload = () => {
    void reloadAppAsync("Crash recovery");
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1 items-center justify-center px-10">
        <Image source={ASSETS.greenBun} className="w-36 h-36 mb-6" contentFit="contain" />

        <Text className="font-balooExtraBold text-3xl text-center text-secondary mb-3">
          {i18next.t("common:crash.title")}
        </Text>

        <Text className="font-baloo text-base text-center text-primary leading-6 mb-8">
          {i18next.t("common:crash.message")}
        </Text>

        <Pressable onPress={handleReload} className="bg-highlight rounded-2xl px-10 py-4 active:opacity-80">
          <Text className="font-balooBold text-white text-base">
            {i18next.t("common:crash.button")}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
