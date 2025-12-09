import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Keyboard, Animated, Platform, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { AiResultMessageDTO } from "@/feature/ai-task-generate/models/ai-result-message-dto";
import { useAiTaskGenerator } from "@/feature/ai-task-generate/hooks/useAiTaskGenerator";

export default function AiTaskSheetScreen() {
  const insets = useSafeAreaInsets();
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const { aiGeneratedMessage, sendMessage } = useAiTaskGenerator({
    setIsAiGenerating,
    setModalType,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <View className="flex-1 bg-transparent">
        <Pressable className="flex-1" onPress={() => router.back()} />

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
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
