import { View, TextInput, Keyboard, Pressable, Text } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";

// ✅ expo-audio (new)
import {
  AudioModule,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

// ✅ file -> base64
import * as FileSystem from "expo-file-system";

// ✅ Buffer polyfill for RN
import { Buffer } from "buffer";

// ✅ Azure Speech SDK
import {
  SpeechConfig,
  AudioConfig,
  SpeechRecognizer,
  ResultReason,
  CancellationReason,
  CancellationDetails,
} from "microsoft-cognitiveservices-speech-sdk";

const AZURE_KEY = "key";
const AZURE_REGION = "location/region";

const speechConfig = SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
speechConfig.speechRecognitionLanguage = "en-US";

export const WriteInput = ({
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
  const sendWriteInput = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    setText(val);
    Keyboard.dismiss();
  };

  const [isTranscribing, setIsTranscribing] = useState(false);

  // ✅ Recorder (expo-audio)
  // We provide custom recording options to increase chance of WAV/PCM on iOS.
  // Android may still not produce a true WAV even if extension is .wav.
  const recordingOptions = useMemo(
    () => ({
      extension: ".wav",
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 256000,

      // iOS-only fields are fine to include; expo-audio ignores unsupported fields per platform.
      // If your TS complains about extra fields, we can tighten types.
      ios: {
        outputFormat: "linearpcm",
        bitDepth: 16,
        isBigEndian: false,
        isFloat: false,
      },
    }),
    [],
  );

  const audioRecorder = useAudioRecorder(recordingOptions as any);
  const recorderState = useAudioRecorderState(audioRecorder);

  // Permissions & audio mode (once)
  useEffect(() => {
    (async () => {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        console.warn("Microphone permission denied.");
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  const getTranscriptionFromUri = async (uri: string) => {
    setIsTranscribing(true);

    try {
      // 1) Read local file -> base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 2) base64 -> Buffer
      const audioBuffer = Buffer.from(base64Audio, "base64");

      // 3) Azure recognize once
      const audioConfig = AudioConfig.fromWavFileInput(audioBuffer);
      const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

      await new Promise<void>((resolve) => {
        recognizer.recognizeOnceAsync((result) => {
          try {
            switch (result.reason) {
              case ResultReason.RecognizedSpeech: {
                const recognized = (result.text ?? "").trim();
                if (recognized) {
                  // append to existing input text (designer-friendly behavior)
                  const merged = text ? `${text.trim()} ${recognized}` : recognized;
                  setText(merged);
                }
                break;
              }

              case ResultReason.NoMatch:
                console.log("NoMatch:", ResultReason[result.reason]);
                break;

              case ResultReason.Canceled: {
                const details = CancellationDetails.fromResult(result);
                if (details.reason === CancellationReason.Error) {
                  console.log("ErrorDetails:", details.errorDetails);
                } else {
                  console.log("CancellationDetails:", details);
                }
                break;
              }

              default:
                console.log("Unexpected result:", result);
                break;
            }
          } finally {
            try {
              recognizer.close();
            } catch {}
            resolve();
          }
        });
      });
    } catch (e: any) {
      console.error("Transcription failed:", e);
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    const perm = await AudioModule.getRecordingPermissionsAsync();
    if (!perm.granted) {
      const req = await AudioModule.requestRecordingPermissionsAsync();
      if (!req.granted) {
        console.warn("Microphone permission denied.");
        return;
      }
    }

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (e: any) {
      console.error("Failed to start recording:", e);
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();

      const uri = audioRecorder.uri;
      if (!uri) {
        console.warn("Recording URI is empty.");
        return;
      }

      await getTranscriptionFromUri(uri);
    } catch (e: any) {
      console.error("Failed to stop recording:", e);
    }
  };

  const toggleRecording = () => {
    if (isAiGenerating || isTranscribing) return;
    if (recorderState.isRecording) stopRecording();
    else startRecording();
  };

  return (
    <View className="pt-2">
      <View className="items-center">
        <View className="w-96 mb-10" style={{ minHeight: 60 }}>
          {/* ✅ Top row: mic button + (optional) hint */}

          <TextInput
            value={text}
            onChangeText={(v: string) => setText(v)}
            onKeyPress={({ nativeEvent: { key } }) => {
              if (key === "Enter") {
                const cleaned = text.replace(/\n$/, "").trim();
                if (!cleaned) return;
                sendWriteInput(cleaned);
              }
            }}
            enablesReturnKeyAutomatically
            autoFocus
            placeholder="What's in your mind?"
            placeholderTextColor={theme.colors.secondary}
            multiline
            className="w-11/12 bg-white text-xl text-gray-800 font-baloo"
            style={{ textAlignVertical: "top", textAlign: "left" }}
          />

          {/* ✅ existing AI error */}
          {aiGeneratedMessage?.errorMessage && (
            <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
          )}

          <View className="w-11/12 flex-row items-center justify-end mb-2">
            <Pressable
              onPress={toggleRecording}
              disabled={isAiGenerating || isTranscribing}
              className={[
                "px-4 py-2 rounded-full",
                recorderState.isRecording ? "bg-red-500" : "bg-gray-900",
                isAiGenerating || isTranscribing ? "opacity-40" : "opacity-100",
              ].join(" ")}
            >
              <Text className="text-white font-baloo text-base">
                {recorderState.isRecording ? "Stop" : "Rec"}
              </Text>
            </Pressable>

            {/* ✅ tiny status */}
            <View className="ml-3">
              {isTranscribing ? (
                <Text className="text-gray-500 font-baloo">Transcribing…</Text>
              ) : recorderState.isRecording ? (
                <Text className="text-gray-500 font-baloo">Listening…</Text>
              ) : null}
            </View>
          </View>
        </View>

        {(isAiGenerating || isTranscribing) && (
          <View className="flex-row items-center mt-4 mb-8 w-full px-2 justify-center">
            <CustomSpinner size={60} style={{ marginRight: 10 }} />
          </View>
        )}
      </View>
    </View>
  );
};
