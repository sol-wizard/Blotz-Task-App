import { useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import type { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardStickyView } from "react-native-keyboard-controller";

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="flex-1" onPress={() => router.back()} />
      <KeyboardStickyView className="pt-2">
        <View className={`rounded-t-3xl px-4 pt-4 bg-background`}>
          <AiModalContent
            modalType={modalType}
            setModalType={(next) => {
              setModalType(next);
            }}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
