import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Image, Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import * as Haptics from "expo-haptics";
import { VoiceWaves } from "@/shared/components/common/voice-wave";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const VoiceInput = ({
  setText,
  hasError,
  sendMessage,
  setInputError,
  errorMessage,
}: {
  setText: (v: string) => void;
  hasError: boolean;
  sendMessage: (v: string) => void;
  setInputError: (v: boolean) => void;
  errorMessage?: string;
}) => {
  const [language, setLanguage] = useState<"en-US" | "zh-CN">("zh-CN");

  // Load saved language preference on mount
  useEffect(() => {
    AsyncStorage.getItem("ai_language_preference").then((saved) => {
      if (saved === "en-US" || saved === "zh-CN") {
        setLanguage(saved);
      }
    });
  }, []);

  const { handleStartListening, recognizing, transcript, stopListening } = useSpeechRecognition({
    language,
  });

  const [idleBlockH, setIdleBlockH] = useState(0);
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
    <View className="items-center mt-12">
      {hasError && (
        <View
          className="bg-background rounded-2xl py-6 px-4 flex-row w-96"
          style={{ minHeight: idleBlockH }}
        >
          <Text className="text-[#3D8DE0] text-2xl font-balooBold pt-2 w-72">{errorMessage}</Text>
          <Image source={ASSETS.greenBun} className="w-20 h-20" />
        </View>
      )}
      {!hasError && (
        <View style={{ minHeight: idleBlockH, width: "100%" }} className="items-center">
          {recognizing ? (
            <Text className="text-xl font-bold text-gray-400 text-center">{transcript}</Text>
          ) : (
            <View onLayout={(e) => setIdleBlockH(e.nativeEvent.layout.height)}>
              <View className="flex-row items-start justify-between w-full px-2">
                <View className="w-10 h-10" />

                <Text className="flex-1 text-black text-4xl font-balooBold text-center pt-2">
                  Braindump tasks{"\n"}with your voice
                </Text>

                <Pressable
                  onPress={() => {
                    const newLang = language === "en-US" ? "zh-CN" : "en-US";
                    setLanguage(newLang);
                    AsyncStorage.setItem("ai_language_preference", newLang);
                  }}
                  className="w-10 h-10 bg-black rounded-full items-center justify-center"
                >
                  <Text className="text-white font-bold text-base">
                    {language === "en-US" ? "EN" : "中"}
                  </Text>
                </Pressable>
              </View>
              <Text className="text-gray-500 font-baloo text-xl text-center mt-2 mx-8">
                Just say your task, and I&apos;ll create it automatically
              </Text>
            </View>
          )}
        </View>
      )}

      <View className="mt-6 items-center">
        <Pressable
          onLongPress={async () => {
            setText("");
            setInputError(false);
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
              Vibration.vibrate(10);
            }
            setShowVoiceWave(true);

            await handleStartListening();
          }}
          onPressOut={handleMicPressOut}
          delayLongPress={250}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <View className="items-center justify-center relative">
            {showVoiceWave && (
              <View style={{ position: "absolute" }}>
                <VoiceWaves />
              </View>
            )}

            <GradientCircle>
              <Ionicons name="mic-outline" size={35} color="white" />
            </GradientCircle>
          </View>
        </Pressable>

        {recognizing ? (
          <Text className="text-lg mt-4 mb-10 text-gray-500 font-baloo">Recognising...</Text>
        ) : (
          <Text className="text-lg mt-4 mb-10 text-gray-500 font-baloo">Hold and speak</Text>
        )}
      </View>
    </View>
  );
};
