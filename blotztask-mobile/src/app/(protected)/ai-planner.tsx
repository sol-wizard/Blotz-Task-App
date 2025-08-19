import BotMessage from "@/feature/ai-chat-hub/components/bot-message";
import { TypingArea } from "@/shared/components/ui/typing-area";
import UserMessage from "@/feature/ai-chat-hub/components/user-message";
import { useSignalRChat } from "@/feature/ai-chat-hub/hooks/useSignalRChat";
import React, { useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import uuid from "react-native-uuid";

export default function AiPlannerScreen() {
  const [conversationId] = useState<string>(() => uuid.v4());
  const { messages, sendMessage } = useSignalRChat(conversationId);
  const [text, setText] = useState("");

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
                    <BotMessage
                      key={index}
                      text={msg.content}
                      tasks={msg.tasks}
                    />
                  ) : (
                    <UserMessage key={index} text={msg.content} />
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
