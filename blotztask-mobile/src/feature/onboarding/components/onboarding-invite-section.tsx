import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useRedeemReferralCode } from "@/feature/referral/hooks/useRedeemReferralCode";

export function OnboardingInviteSection() {
  const { t } = useTranslation("onboarding");
  const [code, setCode] = useState("");
  const [redeemed, setRedeemed] = useState(false);
  const { redeemReferralCode, isRedeeming } = useRedeemReferralCode();

  const handleRedeem = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    redeemReferralCode(trimmed, {
      onSuccess: () => {
        setRedeemed(true);
        Toast.show({ type: "success", text1: t("invite.redeemSuccess") });
      },
    });
  };

  return (
    <View className="flex-1 px-6 pt-8 pb-40">
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-balooBold text-black text-center mb-3">
          {t("invite.title")}
        </Text>
        <Text className="text-base font-baloo text-black/40 text-center mb-12">
          {t("invite.subtitle")}
        </Text>

        {redeemed ? (
          <View className="items-center">
            <Ionicons name="checkmark-circle" size={64} color="#8BCC5A" />
            <Text className="text-lg font-balooBold text-[#8BCC5A] mt-4 text-center">
              {t("invite.redeemSuccess")}
            </Text>
          </View>
        ) : (
          <View>
            <View className="bg-white rounded-2xl px-5 py-4 mb-3">
              <TextInput
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                placeholder={t("invite.codePlaceholder")}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={12}
                className="text-xl font-baloo text-secondary tracking-widest text-center"
              />
            </View>
            <Pressable
              onPress={handleRedeem}
              disabled={code.trim().length === 0 || isRedeeming}
              className={`rounded-2xl py-4 items-center ${
                code.trim().length > 0 && !isRedeeming ? "bg-highlight" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-base font-balooBold ${
                  code.trim().length > 0 && !isRedeeming ? "text-secondary" : "text-gray-400"
                }`}
              >
                {isRedeeming ? t("invite.redeeming") : t("invite.redeemButton")}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
