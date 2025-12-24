import React, { useEffect, useState } from "react";
import { View, Pressable, Text, Modal, TouchableWithoutFeedback } from "react-native";
import { router } from "expo-router";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { installAndroidLanguagePackage } from "@/feature/ai-task-generate/utils/install-android-language-package";
import { requestMicrophonePermission } from "@/feature/ai-task-generate/utils/request-microphone-permission";
import { CloseButton } from "@/feature/ai-task-generate/component/close-button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

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
          className="rounded-t-3xl px-4 pt-4 min-h-[200px]"
          style={{
            backgroundColor: modalType === "add-task-success" ? "#F5F9FA" : "#FFFFFF",
          }}
        >
          <View className="flex-row justify-between pl-6">
            <View className="items-start flex-1">
              <Pressable
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex-row items-center bg-[#F0F4FF] px-4 py-2 rounded-2xl"
              >
                <Text className="text-[#4A5568] font-medium mr-2">
                  {language === "en-US" ? "English" : "中文"}
                </Text>
                <Ionicons
                  name={isDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#4A5568"
                />
              </Pressable>

              {isDropdownOpen && (
                <View
                  className="bg-white rounded-3xl mt-1 overflow-hidden border border-slate-100"
                  style={{
                    width: 160,
                    elevation: 3,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                >
                  <Pressable
                    onPress={() => handleSelectLanguage("en-US")}
                    className="flex-row items-center px-4 py-4"
                  >
                    <View className="w-6">
                      {language === "en-US" && (
                        <Ionicons name="checkmark" size={18} color="#334155" />
                      )}
                    </View>
                    <Text
                      className={`text-base ${language === "en-US" ? "font-bold" : ""} text-slate-700`}
                    >
                      English
                    </Text>
                  </Pressable>

                  <View
                    style={{
                      height: 1,
                      borderStyle: "dashed",
                      borderWidth: 0.5,
                      borderColor: "#CBD5E1",
                      marginHorizontal: 12,
                    }}
                  />

                  <Pressable
                    onPress={() => handleSelectLanguage("zh-CN")}
                    className="flex-row items-center px-4 py-4"
                  >
                    <View className="w-6">
                      {language === "zh-CN" && (
                        <Ionicons name="checkmark" size={18} color="#334155" />
                      )}
                    </View>
                    <Text
                      className={`text-base ${language === "zh-CN" ? "font-bold" : ""} text-slate-700`}
                    >
                      中文
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
          <AiModalContent modalType={modalType} setModalType={setModalType} language={language} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
