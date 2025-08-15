import BotMessage from "@/feature/ai/components/bot-message";
import { TypingArea } from "@/feature/ai/components/typing-area";
import UserMessage from "@/feature/ai/components/user-message";
import { useSignalRChat } from "@/feature/ai/hooks/useSignalRChat";
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

import TypingBubble from "@/feature/ai/components/TypingBubble";
import { useThinkingOverlay } from "@/feature/ai/hooks/useThinkingOverlay";
import { useRef, useEffect } from "react";

export default function AiPlannerScreen() {
  const [conversationId] = useState<string>(() => uuid.v4());
  const { messages = [], sendMessage } = useSignalRChat(conversationId);
  const [text, setText] = useState("");
  const [botRound, setBotRound] = useState(0);
  const thinking = useThinkingOverlay({ delayMs: 300, timeoutMs: 20000 });
  const thinkingTokenRef = useRef<string | null>(null);

  const handleSend = () => {
    
    if (!text.trim()) return;
    thinkingTokenRef.current = thinking.begin();
    setBotRound(prev => prev + 1);
    sendMessage(text);
    setText("");
  };

  const handleDeleteTask = (taskId?: string) => {
    console.log("Delete task:", taskId);
  };

  const handleEditTask = (taskId: string, newTitle: string) => {
    console.log("Edit task:", taskId, "New title:", newTitle);
  };

  const botMsgCount = messages.filter(m => m.isBot).length;
  useEffect(() => {
    if (botMsgCount >= botRound && thinkingTokenRef.current) {
      thinking.end(thinkingTokenRef.current);
      thinkingTokenRef.current = null;
    }
  }, [botMsgCount, botRound, thinking]);

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
                    <BotMessage
                      key={uuid.v4().toString()}
                      text={msg.content}
                      tasks={msg.tasks}
                      onDeleteTask={handleDeleteTask}
                      onEditTask={handleEditTask}
                    />
                  ) : (
                    <UserMessage
                      key={uuid.v4().toString()}
                      text={msg.content}
                    />
                  )
                )}
                {thinking.visible && <TypingBubble />}
            </ScrollView>
          </TouchableWithoutFeedback>

          <TypingArea text={text} setText={setText} handleSend={handleSend} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
