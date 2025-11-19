import React, { useState } from "react";
import { View, Text, Pressable, Image, Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import * as Haptics from "expo-haptics";
import { VoiceWaves } from "@/shared/components/common/voice-wave";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import LottieView from "lottie-react-native";

export const VoiceInput = ({
  setText,
  hasError,
  sendMessage,
  setInputError,
  errorMessage,
  language,
}: {
  setText: (v: string) => void;
  hasError: boolean;
  sendMessage: (v: string) => void;
  setInputError: (v: boolean) => void;
  errorMessage?: string;
  language: string;
}) => {
  const { handleStartListening, recognizing, transcript, stopListening } = useSpeechRecognition({
    language,
  });

  const [showVoiceWave, setShowVoiceWave] = useState(false);

  const handleMicPressOut = async () => {
    await stopListening();

    if (transcript?.trim()) {
      setText(transcript.trim());
      sendMessage(transcript.trim());
    }

    setShowVoiceWave(false);
  };

  return (
    <View className="items-center">
      {hasError ? (
        <View className="bg-background rounded-2xl py-6 px-4 flex-row w-96">
          <Text className="text-[#3D8DE0] text-2xl font-balooBold pt-2 w-72">
            {errorMessage?.trim()
              ? errorMessage
              : "Oops something went over my head. Please try again."}
          </Text>
          <Image source={ASSETS.greenBun} className="w-20 h-20" />
        </View>
      ) : (
        <View className="w-96 mb-16">
          <Text
            className={`text-xl font-bold ${transcript?.trim() ? "text-black" : "text-[#D1D1D6]"}`}
          >
            {transcript?.trim()
              ? transcript
              : "Just hold and talk to me — I’ll make a task for you"}
          </Text>
        </View>
      )}

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
    </View>
  );
};
