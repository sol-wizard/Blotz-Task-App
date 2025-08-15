import React from "react";
import { View } from "react-native";

import { AiTaskDTO } from "../models/ai-task-dto";
import { AIChatTaskCard } from "./single-ai-task";
import uuid from "react-native-uuid";

export default function AiTaskList({ tasks }: { tasks: AiTaskDTO[] }) {
  if (tasks.length === 0) return null;

  return (
    <View className="items-start mt-2">
      {tasks.map((task) => (
        <AIChatTaskCard singleTask={task} key={uuid.v4().toString()} />
      ))}
    </View>
  );
}
