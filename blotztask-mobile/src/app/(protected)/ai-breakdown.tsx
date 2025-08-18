import BreakDownBotMessage from "@/feature/ai/components/breakdown-bot-message";
import { TypingArea } from "@/feature/ai/components/typing-area";
import UserMessage from "@/feature/ai/components/user-message";
import { useBreakdownChat } from "@/feature/breakdown/hooks/useBreakdownChat";
import { convertSubTasksDtoToAiTaskDTO } from "@/feature/ai/services/util/util";

import { TaskDetailsDto } from "@/feature/breakdown/models/task-details-dto";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import uuid from "react-native-uuid";

export default function AiBreakdownScreen() {
  const params = useLocalSearchParams();

  const taskDetails: TaskDetailsDto = {
    title: (params.title as string) || "Plan my weekend project",
    description:
      (params.description as string) ||
      "I want to build a small garden shed in my backyard. I need to plan all the steps from design to completion.",
  };

  const [text, setText] = useState("");
  const { messages, isTyping, sendMessage } = useBreakdownChat(taskDetails);
  const handleSend = () => {
    sendMessage(text);
    setText("");
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["left", "right", "bottom"]}
    >
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
                messages.map((msg) =>
                  msg.isBot ? (
                    <BreakDownBotMessage
                      key={uuid.v4().toString()}
                      text={msg.content}
                      tasks={convertSubTasksDtoToAiTaskDTO(msg.subtasks)}
                    />
                  ) : (
                    <UserMessage
                      key={uuid.v4().toString()}
                      text={msg.content}
                    />
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
