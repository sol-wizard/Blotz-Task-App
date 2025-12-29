import { View, Vibration, TextInput, Keyboard } from "react-native";
import { useEffect, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import * as Haptics from "expo-haptics";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { VoiceButton } from "./voice-button";
import { SendButton } from "./send-button";
import { requestMicrophonePermission } from "../utils/request-microphone-permission";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { installAndroidLanguagePackage } from "../utils/install-android-language-package";
import { AiLanguagePicker } from "./ai-language-picker";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { Platform } from "react-native";
export const AiInput = ({
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
  const [language, setLanguage] = useState<"en-US" | "zh-CN">(() => {
    AsyncStorage.getItem("ai_language_preference").then((saved: string | null) => {
      if (saved === "en-US" || saved === "zh-CN") {
        setLanguage(saved as "en-US" | "zh-CN");
      }
    });
    return "zh-CN";
  });

  useEffect(() => {
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      return;
    }
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
  const { handleStartListening, recognizing, transcript, stopListening, abortListening } =
    useSpeechRecognition({
      language,
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
    // if (transcript?.trim()) {
    //   sendMessage(transcript.trim());
    //   return;
    // }

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

  const sendWriteInput = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    setText(val);
    Keyboard.dismiss();
  };

  return (
    <View className="pt-2">
      <View className="items-center">
        <View className="w-96 mb-10" style={{ minHeight: 60 }}>
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
            placeholder="Hold to speak or tap to write..."
            placeholderTextColor={theme.colors.secondary}
            multiline
            className="w-11/12 bg-white text-xl text-gray-800 font-baloo"
            style={{ textAlignVertical: "top", textAlign: "left" }}
          />
          {aiGeneratedMessage?.errorMessage && (
            <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
          )}
        </View>
        <View className="flex-row items-center justify-between mb-6 w-96">
          {ExpoSpeechRecognitionModule.isRecognitionAvailable() && (
            <AiLanguagePicker value={language} onChange={handleSelectLanguage} />
          )}
          {recognizing ? (
            <VoiceButton
              text={text}
              isRecognizing={recognizing}
              toggleListening={toggleListening}
            />
          ) : text.trim() ? (
            <SendButton
              text={text}
              isGenerating={isAiGenerating}
              abortListening={handleAbortListening}
              sendMessage={sendMessage}
            />
          ) : (
            <VoiceButton
              text={text}
              isRecognizing={recognizing}
              toggleListening={toggleListening}
            />
          )}
        </View>
      </View>
    </View>
  );
};
