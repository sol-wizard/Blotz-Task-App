import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Keyboard } from "react-native";
import { ImageBackground } from "expo-image";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useRedeemReferralCode } from "@/feature/referral/hooks/useRedeemReferralCode";
import { GradientCircle } from "@/shared/components/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";

export function OnboardingInviteSection() {
  const { t } = useTranslation("onboarding");
  const [code, setCode] = useState("");
  const [redeemed, setRedeemed] = useState(false);
  const { redeemReferralCode, isRedeeming } = useRedeemReferralCode();
  const canRedeem = code.trim().length > 0 && !isRedeeming;

  const handleRedeem = () => {
    const trimmed = code.trim();
    if (!trimmed || isRedeeming) return;
    redeemReferralCode(trimmed, {
      onSuccess: () => {
        Keyboard.dismiss();
        setRedeemed(true);
        Toast.show({ type: "success", text1: t("invite.redeemSuccess") });
      },
    });
  };

  return (
    <View className="flex-1 pt-2 pb-40">
      <ImageBackground
        source={ASSETS.onboardingNoteBackground}
        style={{ flex: 1 }}
        contentFit="cover"
      >
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
          // Reserve space below the focused input for the Redeem button.
          bottomOffset={80}
          keyboardShouldPersistTaps="handled"
        >
          {/* The white bun is a vector, so it stays sharp at this size (the bun PNGs are too small). */}
          <GradientCircle size={128}>
            <ASSETS.whiteBun width={64} height={56} />
          </GradientCircle>

          <Text className="text-3xl font-balooBold text-black text-center mt-6">
            {t("invite.title")}
          </Text>
          <Text className="text-base font-baloo text-black/40 text-center mt-2 mb-8">
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
            <View className="w-full">
              <View className="bg-white border border-gray-200 rounded-2xl px-5 py-4 mb-3">
                <TextInput
                  value={code}
                  onChangeText={(text) => setCode(text.toUpperCase())}
                  placeholder={t("invite.codePlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isRedeeming}
                  returnKeyType="done"
                  maxLength={12}
                  className="text-xl font-baloo text-secondary tracking-widest text-center"
                />
              </View>
              <Pressable
                onPress={handleRedeem}
                disabled={!canRedeem}
                className={`rounded-2xl py-4 items-center ${canRedeem ? "bg-highlight" : "bg-gray-200"}`}
              >
                <Text
                  className={`text-base font-balooBold ${canRedeem ? "text-secondary" : "text-gray-400"}`}
                >
                  {isRedeeming ? t("invite.redeeming") : t("invite.redeemButton")}
                </Text>
              </Pressable>
              <Text className="text-sm font-baloo text-black/40 text-center mt-4">
                {t("invite.noCodeHint")}
              </Text>
            </View>
          )}
        </KeyboardAwareScrollView>
      </ImageBackground>
    </View>
  );
}
