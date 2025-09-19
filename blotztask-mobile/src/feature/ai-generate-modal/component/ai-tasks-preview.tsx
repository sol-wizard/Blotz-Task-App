// AiTasksPreview.tsx
import { AiTaskDTO } from "@/feature/ai-chat-hub/models/ai-task-dto";
import React from "react";
import { View, Text } from "react-native";
import { AiTaskCard } from "./ai-task-card";

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
    <View>
      {tasks.map((task) => (
        <AiTaskCard key={task.id} task={task} handleTaskDelete={onDeleteTask} />
      ))}
    </View>
  );
}
