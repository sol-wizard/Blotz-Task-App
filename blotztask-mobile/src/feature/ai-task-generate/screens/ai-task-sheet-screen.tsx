import { useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import type { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { requestRecordingPermissionsAsync } from "expo-audio";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");

  const handleSetModalType = async (next: BottomSheetType) => {
    if (next === "voice-input") {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        console.warn("[Mic] Permission not granted");
        return;
      }
    }
    setModalType(next);
  };

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="absolute inset-0" onPress={() => router.back()} pointerEvents="auto" />
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        <View className="rounded-t-3xl bg-background" pointerEvents="auto">
          <AiModalContent
            modalType={modalType}
            setModalType={(next) => void handleSetModalType(next)}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
