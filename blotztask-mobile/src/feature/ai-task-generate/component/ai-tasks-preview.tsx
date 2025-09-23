import { AiTaskDTO } from "@/feature/ai-chat-hub/models/ai-task-dto";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { AiTaskCard } from "./ai-task-card";
import { Ionicons } from "@expo/vector-icons";

export function AiTasksPreview({
  tasks,
  onDeleteTask,
}: {
  tasks: AiTaskDTO[];
  onDeleteTask: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <View className="py-10 items-center">
        <Text className="text-gray-400">No AI-generated tasks</Text>
      </View>
    );
  }

  return (
    <View className="mb-10 items-center">
      {tasks.map((task) => (
        <AiTaskCard key={task.id} task={task} handleTaskDelete={onDeleteTask} />
      ))}
      <Pressable
        onPress={() => console.log("Up button pressed")}
        className="w-12 h-12 rounded-full bg-black items-center justify-center"
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        <Ionicons name="arrow-up" size={20} color="white" />
      </Pressable>
    </View>
  );
}
