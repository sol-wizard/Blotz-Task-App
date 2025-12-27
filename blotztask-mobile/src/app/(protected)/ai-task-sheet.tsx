import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { installAndroidLanguagePackage } from "@/feature/ai-task-generate/utils/install-android-language-package";
import { requestMicrophonePermission } from "@/feature/ai-task-generate/utils/request-microphone-permission";
import { CloseButton } from "@/feature/ai-task-generate/component/close-button";
import { AiLanguage } from "@/feature/ai-task-generate/component/ai-language";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="flex-1" onPress={() => router.back()} />
      <KeyboardAvoidingView behavior={"padding"}>
        <View
          className={`rounded-t-3xl px-4 pt-4 min-h-[200px] ${
            modalType === "add-task-success" ? "bg-background" : "bg-white"
          }`}
        >
          <View className="flex-row justify-between items-center px-2 mb-4">
            
          </View>
          <AiModalContent modalType={modalType} setModalType={setModalType} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
