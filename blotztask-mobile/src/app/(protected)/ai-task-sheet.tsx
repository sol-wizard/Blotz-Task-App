import React, { useEffect, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { installAndroidLanguagePackage } from "@/feature/ai-task-generate/utils/install-android-language-package";
import { requestMicrophonePermission } from "@/feature/ai-task-generate/utils/request-microphone-permission";
import { CloseButton } from "@/feature/ai-task-generate/component/close-button";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [language, setLanguage] = useState<"en-US" | "zh-CN">(() => {
    AsyncStorage.getItem("ai_language_preference").then((saved) => {
      if (saved === "en-US" || saved === "zh-CN") {
        setLanguage(saved);
      }
    });
    return "zh-CN";
  });

  useEffect(() => {
    requestMicrophonePermission();
    installAndroidLanguagePackage(["en-US", "cmn-Hans-CN"]);
  }, []);

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="flex-1" onPress={() => router.back()} />
      <KeyboardAvoidingView behavior={"padding"}>
        <View
          className="rounded-t-3xl px-4 pt-4 min-h-[200px]"
          style={{
            backgroundColor: modalType === "add-task-success" ? "#F5F9FA" : "#FFFFFF",
          }}
        >
          <View className="flex-row justify-between pl-6">
            <Pressable
              onPress={() => {
                const newLang = language === "en-US" ? "zh-CN" : "en-US";
                setLanguage(newLang);
                AsyncStorage.setItem("ai_language_preference", newLang);
              }}
              className="w-8 h-8 bg-black rounded-full items-center justify-center"
            >
              <Text className="text-white font-bold text-base">
                {language === "en-US" ? "EN" : "中"}
              </Text>
            </Pressable>
            <CloseButton onPress={() => router.back()} size={40} />
          </View>
          <AiModalContent modalType={modalType} setModalType={setModalType} language={language} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
