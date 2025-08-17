import React, { useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useBreakdownChat } from "../../feature/breakdown/hooks/useBreakdownChat";
import BreakdownBotMessage from "../../feature/breakdown/components/breakdown-bot-message";
import UserMessage from "../../feature/ai/components/user-message";
import { TypingArea } from "../../feature/ai/components/typing-area";
import { TaskDetailsDto } from "../../feature/breakdown/models/task-details-dto";

export default function BreakdownScreen() {
  const params = useLocalSearchParams();
  
  // Get task details from navigation params or use default for testing
  const taskDetails: TaskDetailsDto = {
    title: (params.title as string) || "Plan my weekend project",
    description: (params.description as string) || "I want to build a small garden shed in my backyard. I need to plan all the steps from design to completion."
  };
  
  const { messages, isTyping, sendMessage } = useBreakdownChat(taskDetails);
  const [text, setText] = useState("");

  const handleSend = () => {
    sendMessage(text);
    setText("");
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <View className="flex-1">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              className="px-4"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              {messages &&
                messages.map((msg, index) =>
                  msg.isBot ? (
                    <BreakdownBotMessage
                      key={`bot-${index}`}
                      text={msg.content}
                      subtasks={msg.subtasks}
                    />
                  ) : (
                    <UserMessage key={`user-${index}`} text={msg.content} />
                  )
                )}
              
              {isTyping && (
                <View className="mb-4">
                  <View className="bg-gray-100 p-3 rounded-lg mr-12">
                    <Text className="text-gray-500">Bot is thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </TouchableWithoutFeedback>

          <TypingArea text={text} setText={setText} handleSend={handleSend} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


