import { AIChatTaskCard } from "@/feature/ai/components/ai-chat-task-card";
import BreakDownBotMessage from "@/feature/ai/components/breakdown-bot-message";
import { TypingArea } from "@/feature/ai/components/typing-area";
import UserMessage from "@/feature/ai/components/user-message";
import { AiTaskDTO } from "@/feature/ai/models/ai-task-dto";
import { ConversationMessage } from "@/feature/ai/models/conversation-message";
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
  const { task } = useLocalSearchParams();
  const parsedTask = task ? JSON.parse(task as string) : null;

  const [text, setText] = useState("");

  const handleSend = () => {
    console.log("user sent something");
    setText("");
  };

  const mockTasks: AiTaskDTO[] = [
    {
      id: uuid.v4().toString(),
      description: "review classes 1-3",
      title: "Prepare for cybersecurity quiz",
      isAdded: false,
      endTime: new Date().toISOString(),
      hasTime: false,
      labelId: 6,
    },
    {
      id: uuid.v4().toString(),
      description: "buy milk, biscuits, oat",
      title: "Go to shopping center to buy groceries",
      isAdded: false,
      endTime: new Date().toISOString(),
      hasTime: false,
      labelId: 6,
    },
  ];

  const mockMessages: ConversationMessage[] = [
    {
      content: "Let's break this down into doable steps!",
      isBot: true,
      tasks: mockTasks,
    },
  ];

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
              {mockMessages &&
                mockMessages.map((msg) =>
                  msg.isBot ? (
                    <BreakDownBotMessage text={msg.content} tasks={msg.tasks} />
                  ) : (
                    <UserMessage
                      key={uuid.v4().toString()}
                      text={msg.content}
                    />
                  )
                )}
            </ScrollView>
          </TouchableWithoutFeedback>

          <TypingArea text={text} setText={setText} handleSend={handleSend} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
