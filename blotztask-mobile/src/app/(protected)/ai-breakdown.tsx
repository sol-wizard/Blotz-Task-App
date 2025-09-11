import UserMessage from "@/feature/ai-chat-hub/components/user-message";
import { useBreakdownChat } from "@/feature/breakdown/hooks/useBreakdownChat";
import { router, useLocalSearchParams } from "expo-router";
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
import { AddSubtaskBottomSheet } from "@/feature/breakdown/components/add-subtask-bottom-sheet";
import { AddSubtaskDTO } from "@/feature/breakdown/models/add-subtask-dto";
import { addSubtasks } from "@/shared/services/subtask-service";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

export default function AiBreakdownScreen() {
  const { id: taskId } = useLocalSearchParams<{ id?: string }>();
  if (!taskId) throw new Error("Missing task id");

  const [selectedSubtasks, setSelectedSubtasks] = useState<AddSubtaskDTO[]>([]);
  const addSubtaskSheetRef = useRef<BottomSheetModal>(null);

  const { messages, isTyping } = useBreakdownChat(taskId);

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

  const handleAddSubtasks = async () => {
    try {
      await addSubtasks({ taskId: Number(taskId), subtasks: selectedSubtasks });
      router.back();
    } catch (error) {
      console.log("Failed to add subtasks:", error);
    }
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
      <BottomSheetModal
        ref={addSubtaskSheetRef}
        snapPoints={["40%"]}
        handleComponent={null}
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -2 },
        }}
      >
        <AddSubtaskBottomSheet handleAddSubtasks={handleAddSubtasks} />
      </BottomSheetModal>
    </SafeAreaView>
  );
}
