import BotMessage from "@/feature/ai-chat-hub/components/bot-message";
import { TypingArea } from "@/shared/components/ui/typing-area";
import UserMessage from "@/feature/ai-chat-hub/components/user-message";

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

import TypingAnimation from "@/feature/ai-chat-hub/components/typing-animation";
import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";

export default function AiTaskGeneratorScreen() {
  //TODO: we dont need conversation id but we need to chage backend if we want to remove this
  const [conversationId] = useState<string>(() => uuid.v4());
  const { messages, sendMessage, isTyping } =
    useAiTaskGenerator(conversationId);
  const [text, setText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
  };

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, isTyping]);

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["right", "left", "bottom"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <View className="flex-1">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              ref={scrollViewRef}
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
              {isTyping && <TypingAnimation visible={isTyping} />}
            </ScrollView>
          </TouchableWithoutFeedback>

          <TypingArea text={text} setText={setText} handleSend={handleSend} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
