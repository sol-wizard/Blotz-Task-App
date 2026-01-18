import { View, Vibration, TextInput } from "react-native";
import { useEffect, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import * as Haptics from "expo-haptics";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { VoiceButton } from "./voice-button";
import { SendButton } from "./send-button";
import { requestIOSMicrophonePermission } from "../utils/request-microphone-permission";
import { useTranslation } from "react-i18next";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { Language } from "@/shared/models/user-preferences-dto";

export const IOSInput = ({
  text,
  setText,
  sendMessage,
  isAiGenerating,
  aiGeneratedMessage,
}: {
  text: string;
  setText: (v: string) => void;
  sendMessage: (v: string) => void;
  isAiGenerating: boolean;
  aiGeneratedMessage?: AiResultMessageDTO;
}) => {
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

  const handleAbortListening = () => {
    abortListening();
    setText("");
  };

  const showSendButton = text.trim() !== "" || recognizing;
  return (
    <View className="items-center">
      <View className="w-96 mb-10" style={{ minHeight: 60 }}>
        <TextInput
          value={text}
          onChangeText={(v: string) => setText(v)}
          enablesReturnKeyAutomatically
          placeholder={t("input.placeholder")}
          autoFocus
          placeholderTextColor={theme.colors.secondary}
          multiline
          className="w-11/12 bg-white text-xl text-gray-800 font-baloo"
          style={{ textAlignVertical: "top", textAlign: "left" }}
        />
        {aiGeneratedMessage?.errorMessage && (
          <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
        )}
      </View>
      <View className="flex-row items-center justify-end w-96">
        {showSendButton ? (
          <SendButton
            text={text}
            isRecognizing={recognizing}
            isGenerating={isAiGenerating}
            abortListening={handleAbortListening}
            sendMessage={sendMessage}
            stopListening={stopListening}
          />
        ) : (
          <VoiceButton isRecognizing={recognizing} toggleListening={toggleListening} />
        )}
      </View>
    </View>
  );
};
