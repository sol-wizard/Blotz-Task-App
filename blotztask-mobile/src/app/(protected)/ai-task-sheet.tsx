import React, { useEffect, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { installAndroidLanguagePackage } from "@/feature/ai-task-generate/utils/install-android-language-package";
import { requestMicrophonePermission } from "@/feature/ai-task-generate/utils/request-microphone-permission";
import { CloseButton } from "@/feature/ai-task-generate/component/close-button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en-US" as const },
  { label: "中文", value: "zh-CN" as const },
];

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [language, setLanguage] = useState<"en-US" | "zh-CN">(() => {
    AsyncStorage.getItem("ai_language_preference").then((saved) => {
      if (saved === "en-US" || saved === "zh-CN") {
        setLanguage(saved);
      }
    });
    return "zh-CN";
  });

  useEffect(() => {
    requestMicrophonePermission();
    installAndroidLanguagePackage(["en-US", "cmn-Hans-CN"]);
  }, []);

  const handleSelectLanguage = (lang: "en-US" | "zh-CN") => {
    setLanguage(lang);
    AsyncStorage.setItem("ai_language_preference", lang);
    setIsDropdownOpen(false);
  };

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="flex-1" onPress={() => router.back()} />
      <KeyboardAvoidingView behavior={"padding"}>
        <View
          className={`rounded-t-3xl px-4 pt-4 min-h-[200px] ${
            modalType === "add-task-success" ? "bg-[#F5F9FA]" : "bg-white"
          }`}
        >
          <View
            className="flex-row justify-between items-center px-2 mb-4 z-[100]"
            // style={{ zIndex: 1001 }}
          >
            <View className="relative">
              <Pressable
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex-row items-center bg-[#F0F4FF] px-4 py-2 rounded-2xl"
              >
                <Text className="text-[#4A5568] font-medium mr-2">
                  {LANGUAGE_OPTIONS.find((l) => l.value === language)?.label}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#4A5568" />
              </Pressable>

              {isDropdownOpen && (
                <>
                  <Pressable
                    className="absolute -top-[1000] -left-[1000] -right-[1000] -bottom-[1000] bg-transparent"
                    onPress={() => setIsDropdownOpen(false)}
                  />
                  <View className="absolute top-[45px] left-0 w-40 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 z-[102]">
                    {LANGUAGE_OPTIONS.map((option, index) => (
                      <React.Fragment key={option.value}>
                        <Pressable
                          onPress={() => handleSelectLanguage(option.value)}
                          className="flex-row items-center px-4 py-4 active:bg-slate-50"
                        >
                          <View className="w-6">
                            {language === option.value && (
                              <Ionicons name="checkmark" size={18} color="#334155" />
                            )}
                          </View>
                          <Text
                            className={`text-base text-slate-700 ${
                              language === option.value ? "font-bold" : ""
                            }`}
                          >
                            {option.label}
                          </Text>
                        </Pressable>

                        {/* 3. 虚线分割线 (Tailwind 实现) */}
                        {index < LANGUAGE_OPTIONS.length - 1 && (
                          <View className="h-px border-t border-dashed border-[#CBD5E1] mx-3" />
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                </>
              )}
            </View>
            <CloseButton onPress={() => router.back()} size={40} />
          </View>
          <AiModalContent modalType={modalType} setModalType={setModalType} language={language} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
