import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AiTaskDTO } from "@/feature/ai-chat-hub/models/ai-task-dto";
import { AiTaskCard } from "./ai-task-card";

export const AiGeneratedTasks = ({
  tasks = [],
  backToVoiceInput,
  goToConfirmUI,
}: {
  tasks?: AiTaskDTO[];
  backToVoiceInput: () => void;
  goToConfirmUI: () => void;
}) => {
  const handleAddTasks = () => {
    console.log("Add some tasks successfully!");
    goToConfirmUI();
  };
  return (
    <View className="w-full rounded-2xl bg-blue-50 p-4 border border-blue-100">
      <View className="mb-3">
        <View className="flex-row items-center">
          <Ionicons name="eye-outline" size={18} color="#2563eb" />
          <Text className="ml-2 text-[15px] font-semibold text-blue-600">Preview Task</Text>
        </View>
        <Text className="text-[13px] text-slate-500 mt-1">
          Confirm whether the task information is correct
        </Text>
      </View>

      {tasks.length === 0 ? (
        <Text className="text-[13px] text-slate-500">No tasks generated yet.</Text>
      ) : (
        <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
          <View className="gap-3">
            {tasks.map((task) => (
              <AiTaskCard key={task.id} task={task} />
            ))}
          </View>
        </ScrollView>
      )}
      <View className="mt-3 flex-row items-center justify-between gap-4">
        <Pressable
          onPress={backToVoiceInput}
          hitSlop={8}
          className="flex-1 h-12 rounded-full bg-slate-500 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-white font-semibold text-[17px]">Regenerate</Text>
        </Pressable>

        <Pressable
          onPress={handleAddTasks}
          hitSlop={8}
          className="flex-1 h-12 rounded-full bg-green-600 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-white font-semibold text-[17px]">Confirm</Text>
        </Pressable>
      </View>
    </View>
  );
};
