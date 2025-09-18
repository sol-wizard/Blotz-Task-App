// AiGeneratedTasks.tsx
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AiTaskDTO } from "@/feature/ai-chat-hub/models/ai-task-dto";
import { AiTaskCard } from "./ai-task-card";

export const AiGeneratedTasks = ({ tasks = [] }: { tasks?: AiTaskDTO[] }) => {
  return (
    <View className="w-full rounded-2xl bg-blue-50 p-4 border border-blue-100">
      {/* Header */}
      <View className="mb-3">
        <View className="flex-row items-center">
          <Ionicons name="eye-outline" size={18} color="#2563eb" />
          <Text className="ml-2 text-[15px] font-semibold text-blue-600">Preview Task</Text>
        </View>
        <Text className="text-[13px] text-slate-500 mt-1">
          Confirm whether the task information is correct
        </Text>
      </View>

      {/* List */}
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
    </View>
  );
};
