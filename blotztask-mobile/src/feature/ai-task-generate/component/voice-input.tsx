import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { useVoiceInput } from "@/shared/util/useVoiceInput";
import { ASSETS } from "@/shared/constants/assets";
import * as Haptics from "expo-haptics";
import { VoiceWaves } from "@/shared/components/common/voice-wave";

export const VoiceInput = ({
  hasError,
  sendMessage,
  setInputError,
  errorMessage,
}: {
  hasError: boolean;
  sendMessage: (v: string) => void;
  setInputError: (v: boolean) => void;
  errorMessage?: string;
}) => {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<"en" | "zh">("zh");
  const { startListening, partialText, stopAndGetText, isListening } = useVoiceInput({ language });
  const displayText = isListening
    ? [text, partialText].filter(Boolean).join(text ? " " : "")
    : text;

  const [idleBlockH, setIdleBlockH] = useState(0);
  const [showVoiceWave, setShowVoiceWave] = useState(false);

  const handleMicPressOut = async () => {
    const spoken = await stopAndGetText();
    let newText = text;
    if (spoken) {
      newText = text?.length ? `${text.trim()} ${spoken}` : spoken;
      setText(newText);
    }
    if (newText?.trim()) sendMessage(newText.trim());
    setText("");
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
          {isListening ? (
            <TextInput
              value={displayText}
              editable={false}
              placeholderTextColor="#D1D5DB"
              multiline
              className="text-xl font-bold text-gray-400 text-center"
              style={{ fontFamily: "Baloo2-Regular" }}
            />
          ) : (
            <View onLayout={(e) => setIdleBlockH(e.nativeEvent.layout.height)}>
              <View className="flex-row items-start justify-between w-full px-2">
                <View className="w-10 h-10" />

                <Text className="flex-1 text-black text-4xl font-balooBold text-center pt-2">
                  Braindump tasks{"\n"}with your voice
                </Text>

                <Pressable
                  onPress={() => setLanguage((prev) => (prev === "en" ? "zh" : "en"))}
                  className="w-10 h-10 bg-black rounded-full items-center justify-center"
                >
                  <Text className="text-white font-bold text-base">
                    {language === "en" ? "EN" : "中"}
                  </Text>
                </Pressable>
              </View>
              <Text className="text-gray-500 font-baloo text-xl text-center mt-2">
                Just say your task, and I&apos;ll create it automatically
              </Text>
            </View>
          )}
        </View>
      )}

      <View className="mt-6 items-center">
        <Pressable
          onLongPress={async () => {
            setInputError(false);
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
              Vibration.vibrate(10);
            }
            setShowVoiceWave(true);
            await startListening();
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

        {isListening ? (
          <Text className="text-lg mt-4 mb-10 text-gray-500 font-baloo">Recognising...</Text>
        ) : (
          <Text className="text-lg mt-4 mb-10 text-gray-500 font-baloo">Hold and speak</Text>
        )}
      </View>
    </View>
  );
};
