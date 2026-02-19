import { useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import type { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="absolute inset-0" onPress={() => router.back()} pointerEvents="auto" />
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        <View className="rounded-t-3xl px-4 pt-4 bg-background" pointerEvents="auto">
          {/* <AiModalContent
            modalType={modalType}
            setModalType={(next) => {
              setModalType(next);
            }}
          /> */}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
