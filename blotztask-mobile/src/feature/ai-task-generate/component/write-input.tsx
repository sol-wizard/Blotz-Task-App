import { View, TextInput, Keyboard, Pressable, Text } from "react-native";
import { useEffect, useRef, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { AzureSpeechAPI } from "../services/azure-speech-android-apis";
import { useAzureSpeechToken } from "../hooks/useAzureSpeechToken";

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
  const [isListening, setIsListening] = useState(false);
  const { tokenItem, isFetchingAzureToken } = useAzureSpeechToken();
  const subscriptions = useRef<{ remove: () => void }[]>([]);

  useEffect(() => {
    subscriptions.current = [
      AzureSpeechAPI.onPartial((value) => console.log("Azure partial:", value)),
      AzureSpeechAPI.onFinal((value) => console.log("Azure final:", value)),
      AzureSpeechAPI.onCanceled((err) => console.log("Azure error:", err)),
    ];

    return () => {
      subscriptions.current.forEach((sub) => sub.remove());
      subscriptions.current = [];
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      AzureSpeechAPI.stopListen();
      setIsListening(false);
      return;
    }

    if (isFetchingAzureToken || !tokenItem) {
      console.log("Azure speech token not ready");
      return;
    }

    AzureSpeechAPI.startListen({
      token: tokenItem.token,
      region: tokenItem.region,
    });
    setIsListening(true);
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
            autoFocus
            placeholder="What's in your mind?"
            placeholderTextColor={theme.colors.secondary}
            multiline
            className="w-11/12 bg-white text-xl text-gray-800 font-baloo"
            style={{ textAlignVertical: "top", textAlign: "left" }}
          />
          {aiGeneratedMessage?.errorMessage && (
            <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
          )}
        </View>
        <Pressable
          onPress={toggleListening}
          className="w-32 h-10 rounded-full items-center justify-center bg-[#a6d445] mb-6"
        >
          <Text className="text-white font-baloo">{isListening ? "Stop" : "Speak"}</Text>
        </Pressable>

        {isAiGenerating && (
          <View className="flex-row items-center mt-4 mb-8 w-full px-2 justify-center">
            <CustomSpinner size={60} style={{ marginRight: 10 }} />
          </View>
        )}
      </View>
    </View>
  );
};
