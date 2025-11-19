import { View, Text, Pressable, Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import * as Haptics from "expo-haptics";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import LottieView from "lottie-react-native";
import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { ErrorMessageCard } from "./error-message-card";

export const VoiceInput = ({
  setText,
  hasError,
  sendMessage,
  setInputError,
  errorMessage,
  language,
  isAiGenerating,
}: {
  setText: (v: string) => void;
  hasError: boolean;
  sendMessage: (v: string) => void;
  setInputError: (v: boolean) => void;
  errorMessage?: string;
  language: string;
  isAiGenerating: boolean;
}) => {
  const { handleStartListening, recognizing, transcript, stopListening } = useSpeechRecognition({
    language,
  });

  const handleMicPressOut = async () => {
    await stopListening();

    if (transcript?.trim()) {
      setText(transcript.trim());
      sendMessage(transcript.trim());
    }
  };

  return (
    <View className="items-center">
      {hasError ? (
        <ErrorMessageCard errorMessage={errorMessage} />
      ) : (
        <View className="w-96 mb-16" style={{ minHeight: 80 }}>
          <Text
            className={`text-xl font-bold ${transcript?.trim() ? "text-black" : "text-[#D1D1D6]"}`}
          >
            {transcript?.trim()
              ? transcript
              : "Just hold and talk to me — I’ll make a task for you"}
          </Text>
        </View>
      )}

      {!isAiGenerating ? (
        <View className="mt-6 items-center mb-16">
          <Pressable
            onLongPress={async () => {
              setText("");
              setInputError(false);
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
        <View className="mt-6 items-center mb-16">
          <CustomSpinner size={60} />
        </View>
      )}
    </View>
  );
};
