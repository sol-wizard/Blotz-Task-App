import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { AiResultMessageDTO } from "@/feature/ai-task-generate/models/ai-result-message-dto";
import { useAiTaskGenerator } from "@/feature/ai-task-generate/hooks/useAiTaskGenerator";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { installAndroidLanguagePackage } from "@/feature/ai-task-generate/utils/install-android-language-package";
import { requestMicrophonePermission } from "@/feature/ai-task-generate/utils/request-microphone-permission";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const { aiGeneratedMessage, sendMessage, setAiGeneratedMessage } = useAiTaskGenerator({
    setIsAiGenerating,
    setModalType,
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
          className="left-0 right-0 bottom-0 rounded-t-3xl px-4 pt-4 min-h-[200px]"
          style={{
            backgroundColor: modalType === "add-task-success" ? "#F5F9FA" : "#FFFFFF",
          }}
        >
          <AiModalContent
            modalType={modalType}
            setModalType={setModalType}
            aiGeneratedMessage={aiGeneratedMessage as AiResultMessageDTO | undefined}
            sendMessage={sendMessage}
            isAiGenerating={isAiGenerating}
            setAiGeneratedMessage={setAiGeneratedMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
