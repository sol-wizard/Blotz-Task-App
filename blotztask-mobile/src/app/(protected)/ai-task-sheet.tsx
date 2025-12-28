import React, { useEffect, useState } from "react";
import { View, Pressable, Text, Platform } from "react-native";
import { router } from "expo-router";
import { Dropdown } from "react-native-element-dropdown";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { AiModalContent } from "@/feature/ai-task-generate/component/ai-modal-content";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { installAndroidLanguagePackage } from "@/feature/ai-task-generate/utils/install-android-language-package";
import { requestMicrophonePermission } from "@/feature/ai-task-generate/utils/request-microphone-permission";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { FormDivider } from "@/shared/components/ui/form-divider";

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en-US" as const },
  { label: "中文", value: "zh-CN" as const },
];

export default function AiTaskSheetScreen() {
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [language, setLanguage] = useState<"en-US" | "zh-CN">(() => {
    AsyncStorage.getItem("ai_language_preference").then((saved) => {
      if (saved === "en-US" || saved === "zh-CN") {
        setLanguage(saved);
      }
    });
    return "zh-CN";
  });

  useEffect(() => {
    if (Platform.OS === "android") {
      return;
    }

    requestMicrophonePermission();
    installAndroidLanguagePackage(["en-US", "cmn-Hans-CN"]);
  }, []);

  const handleSelectLanguage = (lang: "en-US" | "zh-CN") => {
    setLanguage(lang);
    AsyncStorage.setItem("ai_language_preference", lang);
  };

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="flex-1" onPress={() => router.back()} />
      <KeyboardAvoidingView behavior={"padding"}>
        <View
          className={`rounded-t-3xl px-4 pt-4 min-h-[200px] ${
            modalType === "add-task-success" ? "bg-background" : "bg-white"
          }`}
        >
          <View className="flex-row justify-between items-center px-2 mb-4">
            {Platform.OS !== "android" && (
              <Dropdown
                data={LANGUAGE_OPTIONS}
                labelField="label"
                valueField="value"
                value={language}
                onChange={(item) => handleSelectLanguage(item.value)}
                style={{
                  backgroundColor: "#F0F4FF",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 24,
                  minWidth: 120,
                  borderWidth: 0,
                }}
                selectedTextStyle={{
                  color: "#444964",
                  fontWeight: "600",
                  fontSize: 12,
                  textAlign: "left",
                  marginLeft: 4,
                }}
                containerStyle={{
                  borderRadius: 16,
                  marginTop: 8,
                  width: 180,
                  overflow: "hidden",
                  borderWidth: 1,
                  backgroundColor: "#F1F5F9",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.8,
                  shadowRadius: 16,
                  elevation: 8,
                }}
                activeColor="transparent"
                autoScroll={false}
                renderRightIcon={() => (
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color="#4A5568"
                    style={{ marginLeft: 8 }}
                  />
                )}
                renderItem={(item) => {
                  const isSelected = item.value === language;
                  return (
                    <View key={item.value} className="bg-white">
                      <View className="flex-row items-center px-5 py-2">
                        <View className="w-8 justify-center items-start">
                          {isSelected && <Ionicons name="checkmark" size={20} color="#444964" />}
                        </View>
                        <Text
                          className={`text-[#444964] text-[12px] ${
                            isSelected ? "font-bold" : "font-medium"
                          }`}
                          style={{ fontFamily: "BalooRegular" }}
                        >
                          {item.label}
                        </Text>
                      </View>

                      {LANGUAGE_OPTIONS.indexOf(item) < LANGUAGE_OPTIONS.length - 1 && (
                        <View className="px-4">
                          <FormDivider marginVertical={0} />
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
          <AiModalContent modalType={modalType} setModalType={setModalType} language={language} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
