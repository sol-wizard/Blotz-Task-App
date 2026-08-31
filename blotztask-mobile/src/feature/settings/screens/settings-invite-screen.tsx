import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { ReturnButton } from "@/shared/components/return-button";
import LoadingScreen from "@/shared/components/loading-screen";
import { useMyReferralCode } from "@/feature/referral/hooks/useMyReferralCode";

export default function SettingsInviteScreen() {
  const { t } = useTranslation("settings");
  const { referralCode, isLoading } = useMyReferralCode();

  if (isLoading) return <LoadingScreen />;

  const handleCopy = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    Toast.show({ type: "success", text1: t("invite.copied") });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-5 py-4">
        <ReturnButton />
        <Text className="text-2xl font-balooBold text-secondary ml-3">{t("invite.title")}</Text>
      </View>

      <View className="px-5 mt-2">
        <Text className="text-sm font-baloo text-gray-500 mb-2 px-1">{t("invite.myCodeLabel")}</Text>
        <View className="bg-white rounded-2xl px-5 py-4 flex-row items-center justify-between">
          <Text className="text-2xl font-balooExtraBold text-secondary tracking-widest">
            {referralCode ?? "—"}
          </Text>
          <Pressable onPress={handleCopy} hitSlop={8}>
            <MaterialCommunityIcons name="content-copy" size={22} color="#444964" />
          </Pressable>
        </View>
        <Text className="text-xs font-baloo text-gray-400 mt-2 px-1">{t("invite.myCodeHint")}</Text>
      </View>
    </SafeAreaView>
  );
}
