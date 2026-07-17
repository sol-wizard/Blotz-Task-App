import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { ReturnButton } from "@/shared/components/return-button";
import LoadingScreen from "@/shared/components/loading-screen";
import { useMyInviteCode } from "@/feature/invite/hooks/useMyInviteCode";
import { useRedeemInviteCode } from "@/feature/invite/hooks/useRedeemInviteCode";

export default function SettingsInviteScreen() {
  const { t } = useTranslation("settings");
  const [inputCode, setInputCode] = useState("");

  const { inviteCode, isLoading } = useMyInviteCode();
  const { redeemInviteCode, isRedeeming } = useRedeemInviteCode();

  if (isLoading) return <LoadingScreen />;

  const handleCopy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Toast.show({ type: "success", text1: t("invite.copied") });
  };

  const handleRedeem = () => {
    const code = inputCode.trim();
    if (!code) return;

    redeemInviteCode(code, {
      onSuccess: () => {
        setInputCode("");
        Toast.show({ type: "success", text1: t("invite.redeemSuccess") });
      },
    });
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
            {inviteCode ?? "—"}
          </Text>
          <Pressable onPress={handleCopy} hitSlop={8}>
            <MaterialCommunityIcons name="content-copy" size={22} color="#444964" />
          </Pressable>
        </View>
        <Text className="text-xs font-baloo text-gray-400 mt-2 px-1">{t("invite.myCodeHint")}</Text>
      </View>

      <View className="px-5 mt-6">
        <Text className="text-sm font-baloo text-gray-500 mb-2 px-1">{t("invite.redeemLabel")}</Text>
        <View className="bg-white rounded-2xl px-5 py-4">
          <TextInput
            value={inputCode}
            onChangeText={(text) => setInputCode(text.toUpperCase())}
            placeholder={t("invite.redeemPlaceholder")}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            maxLength={8}
            className="text-lg font-baloo text-secondary tracking-widest"
          />
        </View>
        <Pressable
          onPress={handleRedeem}
          disabled={inputCode.trim().length === 0 || isRedeeming}
          className={`mt-3 rounded-2xl py-4 items-center ${
            inputCode.trim().length > 0 && !isRedeeming ? "bg-highlight" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-balooBold ${
              inputCode.trim().length > 0 && !isRedeeming ? "text-secondary" : "text-gray-400"
            }`}
          >
            {isRedeeming ? t("invite.redeeming") : t("invite.redeemButton")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
