import UserMessage from "@/feature/ai-chat-hub/components/user-message";
import { useBreakdownChat } from "@/feature/breakdown/hooks/useBreakdownChat";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
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
import {
  AddSubtaskBottomSheet,
  AddSubtaskBottomSheetHandle,
} from "@/feature/breakdown/components/add-subtask-bottom-sheet";
import { AddSubtaskDTO } from "@/feature/breakdown/models/addSubtaskDTO";

export default function AiBreakdownScreen() {
  const { id: taskId } = useLocalSearchParams<{ id?: string }>();
  if (!taskId) throw new Error("Missing task id");
  const addSubtaskSheetRef = useRef<AddSubtaskBottomSheetHandle>(null);
  const [selectedSubtasks, setSelectedSubtasks] = useState<AddSubtaskDTO[]>([]);

  // const [text, setText] = useState("");
  const { messages, isTyping } = useBreakdownChat(taskId);
  // const handleSend = () => {
  //   sendMessage(text);
  //   setText("");
  // };

  const handleSelectSubtask = (subTask: AddSubtaskDTO) => {
    setSelectedSubtasks((prev) => {
      const exists = prev.some((st) => st.title === subTask.title);

      let next: AddSubtaskDTO[];
      if (exists) {
        next = prev.filter((st) => st.title !== subTask.title);
      } else {
        next = [...prev, subTask];
      }

      if (next.length > 0) {
        addSubtaskSheetRef.current?.present();
      } else {
        addSubtaskSheetRef.current?.dismiss?.();
      }

      return next;
    });
  };

  const handleAddSubtasks = () => {
    console.log("Adding subtasks:", selectedSubtasks);
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
                      key={index}
                      parentTaskId={taskId as string}
                      text={msg.content}
                      subtasks={msg.subtasks}
                      openAddSubtaskBottomSheet={handleSelectSubtask}
                    />
                  ) : (
                    <UserMessage key={index} text={msg.content} />
                  ),
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

          {/* <TypingArea text={text} setText={setText} handleSend={handleSend} /> */}
        </View>
      </KeyboardAvoidingView>
      <AddSubtaskBottomSheet ref={addSubtaskSheetRef} handleAddSubtasks={handleAddSubtasks} />
    </SafeAreaView>
  );
}
