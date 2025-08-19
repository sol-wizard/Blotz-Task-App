import React from "react";
import { View } from "react-native";

import { AiTaskDTO } from "../models/ai-task-dto";
import { AIChatTaskCard } from "./ai-chat-task-card";

export default function AiTaskList({ tasks }: { tasks: AiTaskDTO[] }) {
  if (tasks.length === 0) return null;

  return (
    <View className="items-start mt-2">
      {tasks.map((task, index) => (
        <AIChatTaskCard task={task} key={index} />
      ))}
    </View>
  );
}
