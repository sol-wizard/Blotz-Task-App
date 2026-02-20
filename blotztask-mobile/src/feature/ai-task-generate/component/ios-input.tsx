import { View, Text, TextInput, Vibration, Pressable } from "react-native";
import React, { useEffect } from "react";
import { theme } from "@/shared/constants/theme";
import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { Language } from "@/shared/models/user-preferences-dto";
import VoiceInputButton from "./voice-input-button";
import * as Haptics from "expo-haptics";
import { requestIOSMicrophonePermission } from "../utils/request-microphone-permission";
import { ErrorMessageCard } from "./error-message-card";

type Props = {
  text: string;
  setText: (v: string) => void;
  sendMessage: (v: string) => void;
  isAiGenerating: boolean;
  aiGeneratedMessage?: any;
};

const IOSInput = ({ text, setText, sendMessage, isAiGenerating, aiGeneratedMessage }: Props) => {
  const { t } = useTranslation("aiTaskGenerate");
  const { userPreferences } = useUserPreferencesQuery();
  const getSttLanguage = () => {
    if (userPreferences?.preferredLanguage === Language.En) return "en-AU";
    if (userPreferences?.preferredLanguage === Language.Zh) return "zh-CN";
    return "en-AU";
  };

  const currentLanguage = getSttLanguage();

  useEffect(() => {
    requestIOSMicrophonePermission();
  }, []);

  const { handleStartListening, recognizing, transcript, stopListening, abortListening } =
    useSpeechRecognition({
      language: currentLanguage,
    });

  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript, setText]);

  const toggleListening = async () => {
    if (recognizing) {
      stopListening();
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Vibration.vibrate(10);
    }

    await handleStartListening();
  };

  const abortListeningMessage = () => {
    abortListening();
    setText("");
  };

  return (
    <View className="mb-8">
      <View className="items-center mb-4">
        <View className="w-12 h-1 rounded-full bg-[#ECECEC]" />
      </View>
      <Text className="font-balooBold text-2xl mb-2 px-4 text-secondary">
        {t("labels.newTask")}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("input.placeholder")}
        autoFocus
        placeholderTextColor={theme.colors.secondary}
        multiline
        className="font-baloo text-lg text-secondary bg-[#F4F4F4] border border-[#ECECEC] rounded-xl h-40 p-4"
        style={{ textAlignVertical: "top", textAlign: "left" }}
      />
      {aiGeneratedMessage?.errorMessage && (
        <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
      )}
      <VoiceInputButton
        isListening={recognizing}
        startListening={toggleListening}
        abortListening={abortListeningMessage}
        stopListening={stopListening}
        isAiGenerating={isAiGenerating}
        hasText={text.trim() !== ""}
        onGenerateTask={() => sendMessage(text)}
      />
    </View>
  );
};

export default IOSInput;
