import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { useVoiceInput } from "@/shared/util/useVoiceInput";

export const VoiceInput = ({
  text,
  setText,
  sendMessage,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
}) => {
  const { startListening, partialText, stopAndGetText, isListening } = useVoiceInput();
  const displayText = isListening
    ? [text, partialText].filter(Boolean).join(text ? " " : "")
    : text;

  const [idleBlockH, setIdleBlockH] = useState(0);

  const handleMicPressOut = async () => {
    const spoken = await stopAndGetText();
    let newText = text;
    if (spoken) {
      newText = text?.length ? `${text.trim()} ${spoken}` : spoken;
      setText(newText);
    }
    if (newText?.trim()) sendMessage(newText.trim());
  };

  return (
    <View className="items-center mt-12">
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
            <Text className="text-black text-4xl font-balooBold text-center pt-2">
              Braindump tasks{"\n"}with your voice
            </Text>
            <Text className="text-gray-500 font-baloo text-xl text-center mt-2">
              Just say your task, and I‘ll create it automatically
            </Text>
          </View>
        )}
      </View>

      <View className="mt-6 items-center">
        <Pressable
          onLongPress={startListening}
          onPressOut={handleMicPressOut}
          delayLongPress={250}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <GradientCircle>
            <Ionicons name="mic-outline" size={35} color="white" />
          </GradientCircle>
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
