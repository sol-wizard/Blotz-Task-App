import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingHintCard } from "@/shared/components/ui/onboarding-hint-card";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [isUserOnboarded, setIsUserOnboarded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("is_user_onboarded")
      .then((value) => {
        if (value === "true") {
          setIsUserOnboarded(true);
        }
      })
      .catch(() => {});

    return () => {};
  }, []);

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="flex-1" onPress={() => router.back()} disabled={!isUserOnboarded} />
      <View className="relative">
        {!isUserOnboarded ? (
          <OnboardingHintCard
            title="Speak your task"
            subtitle="or tap anywhere to type"
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: -80,
            }}
          />
        ) : null}
        <KeyboardAvoidingView behavior={"padding"}>
          <View
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
