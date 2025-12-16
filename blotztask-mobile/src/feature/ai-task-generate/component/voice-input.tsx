import { View, Pressable, Vibration, TextInput, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import * as Haptics from "expo-haptics";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import LottieView from "lottie-react-native";
import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { ErrorMessageCard } from "./error-message-card";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { theme } from "@/shared/constants/theme";
import { useEffect } from "react";

export const VoiceInput = ({
  text,
  sendMessage,
  errorMessage,
  language,
  isAiGenerating,
  setAiGeneratedMessage,
  setText,
}: {
  text: string;
  sendMessage: (v: string) => void;
  errorMessage?: string;
  language: string;
  isAiGenerating: boolean;
  setAiGeneratedMessage: (v?: AiResultMessageDTO) => void;
  setText: (v: string) => void;
}) => {
  const { handleStartListening, recognizing, transcript, stopListening, setTranscript } =
    useSpeechRecognition({
      language,
    });

  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  const sendWriteContent = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    setText(val);
    Keyboard.dismiss();
  };

  const handleMicPressOut = async () => {
    await stopListening();
    if (transcript?.trim()) {
      sendMessage(transcript.trim());
    }
  };

  return (
    <View className="items-center">
      <View className="w-96 mb-10" style={{ minHeight: 60 }}>
        <TextInput
          value={text}
          onChangeText={(v: string) => setText(v)}
          onKeyPress={({ nativeEvent: { key } }) => {
            if (key === "Enter") {
              const cleaned = text.replace(/\n$/, "").trim();
              if (!cleaned) return;
              sendWriteContent(cleaned);
            }
          }}
          enablesReturnKeyAutomatically
          placeholder="Hold to speak or tap to write..."
          placeholderTextColor={theme.colors.secondary}
          multiline
          className="bg-white text-2xl text-gray-800 font-baloo mb-8"
          style={{ textAlignVertical: "top", textAlign: "left" }}
        />
        {errorMessage && !isAiGenerating && <ErrorMessageCard errorMessage={errorMessage} />}
      </View>

      {!isAiGenerating ? (
        <View className="mt-4 mb-8 items-center">
          <Pressable
            onLongPress={async () => {
              setTranscript("");
              setAiGeneratedMessage();

              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch {
                Vibration.vibrate(10);
              }
              await handleStartListening();
            }}
            onPressOut={handleMicPressOut}
            delayLongPress={250}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View className="items-center justify-center">
              <GradientCircle size={60}>
                {recognizing ? (
                  <LottieView
                    source={ASSETS.jumpingDots}
                    autoPlay
                    loop
                    style={{ width: 80, height: 80, marginLeft: 4 }}
                  />
                ) : (
                  <Ionicons name="mic-outline" size={28} color="white" />
                )}
              </GradientCircle>
            </View>
          </Pressable>
        </View>
      ) : (
        <View className="items-center mt-4 mb-8">
          <CustomSpinner size={60} />
        </View>
      )}
    </View>
  );
};
