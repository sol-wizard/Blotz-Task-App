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

import TypingBubble from "@/feature/ai-chat-hub/components/typing-bubble";
import { useThinkingOverlay } from "@/feature/ai-chat-hub/hooks/useThinkOverlay";
import { useRef, useEffect } from "react";

export default function AiPlannerScreen() {
  const [conversationId] = useState<string>(() => uuid.v4());
  const { messages = [], sendMessage } = useSignalRChat(conversationId);
  const [text, setText] = useState("");
  const [botRound, setBotRound] = useState(0);
  const thinking = useThinkingOverlay({ delayMs: 300, timeoutMs: 20000 });
  const thinkingTokenRef = useRef<string | null>(null);
  const prevBotCountRef = useRef<number>(0);

  const handleSend = () => {
    if (!text.trim()) return;
    thinkingTokenRef.current = thinking.begin();
    setBotRound(prev => prev + 1);
    sendMessage(text);
    setText("");
  };

  const botMsgCount = messages.filter((m) => m.isBot).length;
  useEffect(() => {
    const prev = prevBotCountRef.current;
    if (botMsgCount > prev && thinkingTokenRef.current) {
      thinking.end(thinkingTokenRef.current);
      thinkingTokenRef.current = null;
    }
    prevBotCountRef.current = botMsgCount;
  }, [botMsgCount]);

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
                {thinking.visible && <TypingBubble />}
            </ScrollView>
          </TouchableWithoutFeedback>

          <TypingArea text={text} setText={setText} handleSend={handleSend} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
