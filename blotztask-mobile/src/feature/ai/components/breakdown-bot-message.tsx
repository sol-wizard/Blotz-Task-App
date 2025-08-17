import React from "react";
import { Text, View } from "react-native";
import { AiTaskDTO } from "../models/ai-task-dto";
import { AIChatTaskCard } from "./ai-chat-task-card";

export default function BreakDownBotMessage({
  text,
  tasks = [],
}: {
  text: string;
  tasks?: AiTaskDTO[];
}) {
  return (
    <View className="flex-col mb-3">
      <View className="bg-[#F2F2F7] px-3 py-2 rounded-t-2xl rounded-br-2xl max-w-[80%] mb-4">
        <Text className="text-black text-base">{text}</Text>
      </View>

      {tasks.length > 0 &&
        tasks.map((task: AiTaskDTO) => (
          <AIChatTaskCard
            task={task}
            className="border rounded-2xl border-gray-300"
          />
        ))}
    </View>
  );
}
