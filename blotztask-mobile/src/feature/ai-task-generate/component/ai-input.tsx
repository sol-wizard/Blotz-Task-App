import { Pressable, View, Vibration, TextInput, Keyboard } from "react-native";
import { useEffect } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { Ionicons } from "@expo/vector-icons";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import * as Haptics from "expo-haptics";
import LottieView from "lottie-react-native";
import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { CloseButton } from "./close-button";

export const AiInput = ({
  text,
  setText,
  sendMessage,
  isAiGenerating,
  aiGeneratedMessage,
  language,
}: {
  text: string;
  setText: (v: string) => void;
  sendMessage: (v: string) => void;
  isAiGenerating: boolean;
  aiGeneratedMessage?: AiResultMessageDTO;
  language: string;
}) => {
  const { handleStartListening, recognizing, transcript, stopListening } = useSpeechRecognition({
    language,
  });

  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  const sendAndDismiss = (msg: string) => {
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
                sendAndDismiss(cleaned);
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

        {!isAiGenerating ? (
          <View className="mt-4 mb-10 items-center">
            <Pressable
              onLongPress={async () => {
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
          <View className="flex-row items-center mt-4 mb-8 w-full px-2 justify-center">
            <CustomSpinner size={60} style={{ marginRight: 10 }} />
          </View>
        )}
      </View>
    </View>
  );
};
