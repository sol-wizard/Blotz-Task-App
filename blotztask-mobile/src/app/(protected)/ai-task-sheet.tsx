import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { OnboardingHintCard } from "@/shared/components/ui/onboarding-hint-card";
import { useAiOnboardingStatus } from "@/feature/ai-task-generate/hooks/useAiOnboardingStatus";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [sheetLayoutY, setSheetLayoutY] = useState(0);
  const { isUserOnboardedAi } = useAiOnboardingStatus();

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="flex-1" onPress={() => router.back()} disabled={!isUserOnboardedAi} />
      <View className="relative">
        {!isUserOnboardedAi && (
          <OnboardingHintCard
            key={modalType}
            title={modalType === "task-preview" ? "Happy with this? ✨" : "Speak your task"}
            subtitle={
              modalType === "task-preview" ? "Add to your task list" : "or tap anywhere to type"
            }
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: sheetLayoutY - 100,
              zIndex: 10,
            }}
          />
        )}

        <KeyboardAvoidingView behavior={"padding"}>
          <View
            onLayout={(event) => setSheetLayoutY(event.nativeEvent.layout.y)}
            className={`rounded-t-3xl px-4 pt-4 min-h-[200px] ${
              modalType === "add-task-success" ? "bg-background" : "bg-white"
            }`}
          >
            <AiModalContent modalType={modalType} setModalType={setModalType} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
