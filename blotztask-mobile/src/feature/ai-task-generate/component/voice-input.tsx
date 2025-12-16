import { View, Text, Pressable, Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import * as Haptics from "expo-haptics";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import LottieView from "lottie-react-native";
import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { ErrorMessageCard } from "./error-message-card";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";

export const VoiceInput = ({
  sendMessage,
  errorMessage,
  language,
  isAiGenerating,
  setAiGeneratedMessage,
}: {
  sendMessage: (v: string) => void;
  errorMessage?: string;
  language: string;
  isAiGenerating: boolean;
  setAiGeneratedMessage: (v?: AiResultMessageDTO) => void;
}) => {
  const { handleStartListening, recognizing, transcript, stopListening, setTranscript } =
    useSpeechRecognition({
      language,
    });

  const handleMicPressOut = async () => {
    await stopListening();
    if (transcript?.trim()) {
      sendMessage(transcript.trim());
    }
  };

  return (
    <View className="items-center">
      <View className="w-96 mb-10" style={{ minHeight: 60 }}>
        <Text
          className={`text-xl font-baloo font-bold mb-10 ${transcript?.trim() ? "text-black" : "text-[#D1D1D6]"}`}
        >
          {transcript?.trim() ? transcript : "Just hold and talk to me — I’ll make a task for you"}
        </Text>
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
