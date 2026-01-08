import React, { useEffect, useState } from "react";
import { View, Pressable, Image, Text } from "react-native";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASSETS } from "@/shared/constants/assets";

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
          <View
            pointerEvents="none"
            className="absolute left-6 right-6 flex-row items-center bg-white rounded-[24px] px-4 py-3.5"
            style={{
              top: -72,
              zIndex: 10,
              shadowColor: "#000000",
              shadowOpacity: 0.1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            <View className="w-[38px] h-[38px] rounded-full items-center justify-center mr-3">
              <Image source={ASSETS.greenBun} className="w-5 h-5" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-[#2E6AE6]">Speak your task</Text>
              <Text className="text-xs text-[#2E6AE6]">or tap anywhere to type</Text>
            </View>
          </View>
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
