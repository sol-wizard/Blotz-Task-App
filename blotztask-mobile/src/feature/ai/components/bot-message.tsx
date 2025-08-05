import React from "react";
import { Text, View } from "react-native";
import ReturnedTasksList from "./returned-tasks-list";
import { TaskDetailDTO } from "../models/task-detail-dto";

export default function BotMessage({
  text,
  tasks = [],
  onDeleteTask,
  onEditTask,
}: {
  text: string;
  tasks?: TaskDetailDTO[];
  onDeleteTask: (taskId: number) => void;
  onEditTask: (taskId: number, newTitle: string) => void;
}) {
  return (
    <View className="flex-row items-end justify-start mb-3">
      <View className="bg-[#F2F2F7] px-3 py-2 rounded-t-2xl rounded-br-2xl max-w-[80%]">
        <Text className="text-black text-base">{text}</Text>
        {tasks.length > 0 && (
          <ReturnedTasksList
            tasks={tasks}
            onDeleteTask={onDeleteTask}
            onEditTask={onEditTask}
          />
        )}
      </View>
    </View>
  );
}
