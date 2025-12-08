import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Keyboard, Animated, Platform } from "react-native";
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

  const [sheetHeightPct, setSheetHeightPct] = useState<number>(38);

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const keyboardHeight = e.endCoordinates.height;

      Animated.timing(translateY, {
        toValue: -keyboardHeight + insets.bottom,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, translateY]);

  useEffect(() => {
    const taskCount = aiGeneratedMessage?.extractedTasks?.length ?? 0;

    let targetPct = 38;

    if (modalType === "task-preview") {
      const base = 35;
      const perTask = 5;
      targetPct = Math.min(80, base + taskCount * perTask);
    } else if (modalType === "add-task-success") {
      targetPct = 40;
    }

    setSheetHeightPct(targetPct);
  }, [modalType]);

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="absolute inset-0" onPress={() => router.back()} />

      <Animated.View
        className="absolute left-0 right-0 bottom-0 rounded-t-3xl px-4 pt-4"
        style={{
          height: `${sheetHeightPct}%`,
          paddingBottom: insets.bottom + 16,
          transform: [{ translateY }],
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
      </Animated.View>
    </View>
  );
}
