import { View, Text, TextInput, Pressable, Vibration } from "react-native";
import React, { useEffect } from "react";
import { theme } from "@/shared/constants/theme";
import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { Language } from "@/shared/models/user-preferences-dto";
import VoiceInputButton from "./voice-input-button";
import * as Haptics from "expo-haptics";
import { requestIOSMicrophonePermission } from "../utils/request-microphone-permission";

type Props = {
  text: string;
  setText: (v: string) => void;
  sendMessage: (v: string) => void;
  isAiGenerating: boolean;
  aiGeneratedMessage?: any;
};

const AiInput = ({ text, setText, sendMessage, isAiGenerating }: Props) => {
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
  }, [transcript]);

  const showSendButton = text.trim() !== "" || recognizing;

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

  return (
    <View>
      <Text className="font-baloo text-lg mb-2">New Task</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("input.placeholder")}
        autoFocus
        placeholderTextColor={theme.colors.secondary}
        multiline
        className="bg-[#F2F2F2] rounded-xl h-40 p-4"
        style={{ textAlignVertical: "top", textAlign: "left" }}
      />
      {showSendButton ? (
        <Pressable className="bg-[#F2F2F2] rounded-full mt-4 p-4 items-center">
          <Text className="font-bold">+ Generate Task</Text>
        </Pressable>
      ) : (
        <VoiceInputButton
          isListening={recognizing}
          startListening={toggleListening}
          abortListening={abortListening}
          sendMessage={() => sendMessage(text)}
          isAiGenerating={isAiGenerating}
        />
      )}
    </View>
  );
};

export default AiInput;
