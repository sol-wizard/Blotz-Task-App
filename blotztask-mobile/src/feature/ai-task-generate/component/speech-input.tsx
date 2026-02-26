import { View, Text, TextInput } from "react-native";
import { useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import VoiceInputButton from "./voice-input-button";
import { useTranslation } from "react-i18next";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { transcribeAudioFile } from "../services/speech-transcription-service";

export const SpeechInput = ({
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
  const { t } = useTranslation(["aiTaskGenerate", "common"]);
  const [isListening, setIsListening] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startListening = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        console.warn("[Mic] Permission not granted");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsListening(true);
    } catch (error) {
      console.warn("[Mic] Error creating recording.", error);
    }
  };

  const uploadAudio = async () => {
    try {
      if (!isListening) {
        console.warn("[Mic] No active recording");
        return;
      }

      setIsUploadingAudio(true);
      await recorder.stop();
      const uri = recorder.uri;
      setIsListening(false);

      if (!uri) {
        console.warn("[Mic] No recording URI found");
        return;
      }

      const transcribedText = await transcribeAudioFile({
        uri,
        fileName: "speech.wav",
        mimeType: "audio/wav",
      });
      setText(transcribedText);
    } catch (error) {
      console.warn("[Mic] Error stopping recording.", error);
    } finally {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch(() => undefined);
      setIsUploadingAudio(false);
    }
  };

  const abortListening = () => {
    setIsListening(false);
    setText("");

    void (async () => {
      try {
        if (recorder.isRecording) {
          await recorder.stop();
        }
      } finally {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        }).catch(() => undefined);
      }
    })();
  };

  return (
    <View className="mb-8">
      <View className="items-center mb-4">
        <View className="w-12 h-1 rounded-full bg-[#ECECEC]" />
      </View>
      <Text className="font-balooBold text-2xl mb-2 px-4 text-secondary">
        {t("aiTaskGenerate:labels.newTask")}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("aiTaskGenerate:input.placeholder")}
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
        isListening={isListening}
        startListening={startListening}
        abortListening={abortListening}
        stopListening={uploadAudio}
        isAiGenerating={isAiGenerating || isUploadingAudio}
        hasText={text.trim() !== ""}
        onGenerateTask={() => sendMessage(text)}
      />
    </View>
  );
};
