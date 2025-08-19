import { TypingArea } from "@/shared/components/ui/typing-area";
import UserMessage from "@/feature/ai-chat-hub/components/user-message";
import { useBreakdownChat } from "@/feature/breakdown/hooks/useBreakdownChat";
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
import BreakdownBotMessage from "@/feature/breakdown/components/breakdown-bot-message";

export default function AiBreakdownScreen() {
  const params = useLocalSearchParams();

  const taskDetails: TaskDetailsDto = {
    title: params.title as string,
    description: params.description as string,
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
                messages.map((msg, index) =>
                  msg.isBot ? (
                    <BreakdownBotMessage
                      key={index}
                      parentTaskId={params.id as string}
                      text={msg.content}
                      subtasks={msg.subtasks}
                    />
                  ) : (
                    <UserMessage key={index} text={msg.content} />
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
