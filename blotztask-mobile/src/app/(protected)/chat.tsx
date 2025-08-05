import BotMessage from "@/feature/ai/components/bot-message";
import UserMessage from "@/feature/ai/components/user-message";
import { useSignalRChat } from "@/feature/ai/hooks/useSignalRChat";
import { TaskDetailDTO } from "@/feature/ai/models/tasks";
import { generateAiTask } from "@/feature/ai/services/ai-service";
import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { IconButton } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Message = {
  id: number;
  text: string;
  from: "user" | "bot";
  tasks?: TaskDetailDTO[];
};

const initialMessages: Message[] = [
  {
    id: 1,
    text: "How can I help you today?",
    from: "bot",
  },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");

  // const handleReceive = useCallback(async (msg: string) => {
  //   try {
  //     const { message, tasks } = await generateAiTask(msg);

  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         id: prev.length + 1,
  //         text: message,
  //         from: "bot",
  //         tasks: tasks,
  //       },
  //     ]);
  //   } catch (error) {
  //     console.error("Failed to generate AI task:", error);

  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         id: prev.length + 1,
  //         text: "Sorry, something went wrong while generating tasks.",
  //         from: "bot",
  //       },
  //     ]);
  //   }
  // }, []);

  const sampleTasks: TaskDetailDTO[] = [
    {
      id: 1,
      description:
        "Write a detailed project proposal for the new mobile app, including scope, timeline, and budget.",
      title: "Draft Project Proposal",
      endTime: new Date("2025-08-06T17:00:00Z"),
    },
    {
      id: 2,
      description:
        "Review the pull requests for the latest feature branch and provide feedback to the development team.",
      title: "Code Review for Feature Branch",
      endTime: new Date("2025-08-07T12:00:00Z"),
    },
    {
      id: 3,
      description:
        "Prepare the presentation slides for next week's client meeting, focusing on the new AI-powered features.",
      title: "Prepare Client Presentation",
      endTime: new Date("2025-08-08T09:30:00Z"),
    },
  ];

  const handleReceive = useCallback((msg: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        text: msg,
        from: "bot",
        tasks: sampleTasks,
      },
    ]);
  }, []);

  const { sendMessage } = useSignalRChat(handleReceive);

  const handleSend = () => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: text.trim(),
      from: "user",
      tasks: sampleTasks,
    };

    setMessages([...messages, userMessage]);
    sendMessage(text.trim());
    setText("");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1">
            <ScrollView
              className="px-4 pt-4"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) =>
                msg.from === "bot" ? (
                  <BotMessage key={msg.id} text={msg.text} tasks={msg.tasks} />
                ) : (
                  <UserMessage key={msg.id} text={msg.text} />
                )
              )}
            </ScrollView>

            <View className="flex-row items-center px-3 py-2 border-t border-gray-200 bg-white">
              <TextInput
                className="flex-1 text-base text-gray-900"
                placeholder="Remind me 10 mins before my interview..."
                value={text}
                onChangeText={setText}
                onSubmitEditing={handleSend}
                placeholderTextColor="#aaa"
                returnKeyType="send"
              />
              <IconButton icon="send" size={20} onPress={handleSend} />
              <IconButton icon="microphone" size={20} onPress={() => {}} />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
