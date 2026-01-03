import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

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
          <AiModalContent modalType={modalType} setModalType={setModalType} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
