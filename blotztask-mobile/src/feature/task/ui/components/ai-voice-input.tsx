import { useVoiceInput } from "@/shared/util/useVoiceInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AiGeneratedTasks } from "./ai-generated-tasks";
import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";

export const AiVoiceInput = () => {
  const { startListening, stopAndGetText, isListening } = useVoiceInput();
  const [showTaskList, setShowTaskList] = useState(false);
  const [text, setText] = useState("");
  const { messages, sendMessage, isTyping } = useAiTaskGenerator();

  const handleMicPressOut = async () => {
    const spoken = await stopAndGetText();

    let newText = text;
    if (spoken) {
      newText = text?.length ? `${text.trim()} ${spoken}` : spoken;
      setText(newText);
    }

    if (newText?.trim()) {
      sendMessage(newText.trim());
    }
  };
  useEffect(() => {
    const latest = messages.at(-2);
    const shouldShowAiTasks = !!latest?.isBot && (latest?.tasks?.length ?? 0) > 0;
    setShowTaskList(shouldShowAiTasks);
    console.log("AiVoiceInput messages:", messages);
  }, [messages]);
  return (
    <View className="w-[86%] rounded-3xl bg-white p-6 items-center">
      <View className="w-full flex-row items-center mb-5">
        <View className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-pink-100">
          <Ionicons name="sparkles-outline" size={18} color="#9c27b0" />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-semibold text-gray-900">AI Generate</Text>
          <Text className="text-[13px] text-gray-500">
            Speak your task, AI will automatically create
          </Text>
        </View>
      </View>

      {!showTaskList && !isTyping && (
        <>
          <Pressable
            onLongPress={startListening}
            onPressOut={handleMicPressOut}
            delayLongPress={250}
          >
            <LinearGradient
              colors={["#FF4D79", "#A84DFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 60,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <Ionicons name="mic" size={40} color="#fff" />
            </LinearGradient>
          </Pressable>

          {isListening ? (
            <Text className="mt-4 text-gray-500">AI is listening...</Text>
          ) : (
            <Text className="mt-4 text-gray-500">Click to start voice entry</Text>
          )}
        </>
      )}
      {isTyping && <Text>Ai is thinking...</Text>}

      {showTaskList && (
        <AiGeneratedTasks
          tasks={messages.at(-2)?.tasks ?? []}
          backToVoiceInput={() => setShowTaskList(false)}
        />
      )}
    </View>
  );
};
