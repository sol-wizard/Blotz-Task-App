import { useEffect, useState } from "react";
import { View, Pressable, Platform, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import type { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { AI_TASK_CONSENT_KEY } from "@/shared/constants/token-key";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [isConsentLoading, setIsConsentLoading] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const { t } = useTranslation("aiTaskGenerate");

  useEffect(() => {
    const loadConsent = async () => {
      let storedConsent: string | null = null;

      try {
        storedConsent = await AsyncStorage.getItem(AI_TASK_CONSENT_KEY);
        const consentAccepted = storedConsent === "1";
        setHasConsent(consentAccepted);

        if (!consentAccepted) {
          Alert.alert(t("consent.title"), t("consent.description"), [
            {
              text: t("consent.decline"),
              style: "cancel",
              onPress: () => {
                setIsConsentLoading(true);
                router.back();
              },
            },
            {
              text: t("consent.accept"),
              onPress: async () => {
                await AsyncStorage.setItem(AI_TASK_CONSENT_KEY, "1");
                setHasConsent(true);
                setIsConsentLoading(true);
              },
            },
          ]);
          return;
        }
      } finally {
        if (storedConsent === "1") {
          setIsConsentLoading(true);
        }
      }
    };

    loadConsent();
  }, []);

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="absolute inset-0" onPress={() => router.back()} pointerEvents="auto" />
      {hasConsent && (
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
        >
          <View className="rounded-t-3xl px-4 pt-4 bg-background" pointerEvents="auto">
            {!isConsentLoading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator />
              </View>
            ) : hasConsent ? (
              <AiModalContent
                modalType={modalType}
                setModalType={(next) => {
                  setModalType(next);
                }}
              />
            ) : (
              <View className="py-10" />
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
