import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import type { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { OnboardingCard } from "@/shared/components/ui/onboarding-card";
import { useUserOnboardingStatus } from "@/feature/ai-task-generate/hooks/useUserOnboardingStatus";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [sheetLayoutY, setSheetLayoutY] = useState(0);
  const { isUserOnboarded, setUserOnboarded } = useUserOnboardingStatus();

  const updateOnboarded = () => {
    if (!isUserOnboarded && !setUserOnboarded.isPending) {
      setUserOnboarded.mutate(true);
    }
  };

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="flex-1" onPress={() => router.back()} disabled={!isUserOnboarded} />
      <View className="relative">
        {!isUserOnboarded && (
          <OnboardingCard
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
            <AiModalContent
              modalType={modalType}
              setModalType={(next) => {
                setModalType(next);
                if (next === "add-task-success") {
                  updateOnboarded();
                }
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
