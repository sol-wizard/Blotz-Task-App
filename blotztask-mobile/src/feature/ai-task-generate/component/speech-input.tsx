import { View, Text, TextInput, Vibration } from "react-native";
import { useEffect, useRef, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import VoiceInputButton from "./voice-input-button";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
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

  const recordingRef = useRef<Audio.Recording | null>(null);
  const isStoppingRef = useRef(false);
  const transcriptBufferRef = useRef("");

  useEffect(() => {
    Audio.requestPermissionsAsync().then((permission) => {
      if (!permission.granted) {
        console.warn("[Mic] Microphone permission not granted. Voice input will not work.");
      }
    });
  }, []);

  const toAudioMimeType = (_uri: string) => "audio/wav";

  const cleanupRecordingRef = () => {
    recordingRef.current?.setOnRecordingStatusUpdate(null);
    recordingRef.current = null;
  };

  const startRecordingChunk = async () => {
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: {
        extension: ".wav",
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
      },
      ios: {
        extension: ".wav",
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.MAX,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: "audio/wav",
        bitsPerSecond: 256000,
      },
    } as any);
    await recording.startAsync();
    recordingRef.current = recording;
  };

  const uploadRecordingAndHandleTranscript = async (uri: string, shouldSendToBackend: boolean) => {
    setIsUploadingAudio(true);
    try {
      const transcribedText = await transcribeAudioFile({
        uri,
        fileName: "speech.wav",
        mimeType: toAudioMimeType(uri),
      });
      const chunkText = transcribedText.trim();
      if (!chunkText) return;

      const mergedText = transcriptBufferRef.current
        ? `${transcriptBufferRef.current} ${chunkText}`.replace(/\s+/g, " ").trim()
        : chunkText;

      transcriptBufferRef.current = mergedText;
      setText(mergedText);

      if (shouldSendToBackend) sendMessage(mergedText);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const startListening = async () => {
    try {
      isStoppingRef.current = false;

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      await startRecordingChunk();
      setIsListening(true);
      transcriptBufferRef.current = "";
      setText("");
    } catch (err) {
      console.error("Failed to start recording:", err);
      cleanupRecordingRef();
      setIsListening(false);
    }
  };

  const stopListening = async (transcribe = true, shouldSendToBackend = false) => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      const recording = recordingRef.current;
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        cleanupRecordingRef();

        if (transcribe && uri) {
          await uploadRecordingAndHandleTranscript(uri, shouldSendToBackend);
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      setIsListening(false);
    } catch (err) {
      console.error("Error stopping recording session:", err);
      cleanupRecordingRef();
      setIsListening(false);
    } finally {
      isStoppingRef.current = false;
    }
  };

  const abortListening = async () => {
    await stopListening(false, false);
    transcriptBufferRef.current = "";
    setText("");
  };

  const onPressSend = () => {
    const finalUserText = text.trim();
    if (!finalUserText) return;
    sendMessage(finalUserText);
  };

  const toggleListening = async () => {
    if (isListening) {
      await stopListening(true, false);
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Vibration.vibrate(10);
    }

    await startListening();
  };

  useEffect(
    () => () => {
      const recording = recordingRef.current;
      if (!recording) return;
      recording.setOnRecordingStatusUpdate(null);
      void recording.stopAndUnloadAsync().catch(() => undefined);
      recordingRef.current = null;
    },
    [],
  );

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
        startListening={toggleListening}
        abortListening={abortListening}
        stopListening={() => {
          void stopListening(true);
        }}
        isAiGenerating={isAiGenerating || isUploadingAudio}
        hasText={text.trim() !== ""}
        onGenerateTask={onPressSend}
      />
    </View>
  );
};
