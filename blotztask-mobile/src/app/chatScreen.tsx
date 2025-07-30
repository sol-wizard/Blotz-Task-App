import BotMessage from "@/feature/ai/components/bot-message";
import UserMessage from "@/feature/ai/components/user-message";
import { useSignalRChat } from "@/feature/ai/hooks/useSignalRChat";
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
  tasks?: { id: number; title: string }[];
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

  const handleReceive = useCallback((msg: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        text: msg,
        from: "bot",
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
