import React from "react";
import { Text, View } from "react-native";
import AiTaskList from "./ai-task-list";
import { AiTaskDTO } from "../models/ai-task-dto";

export default function BotMessage({ text, tasks = [] }: { text: string; tasks?: AiTaskDTO[] }) {
  return (
    <View className="flex-row items-end justify-start mb-3">
      <View className="bg-[#F2F2F7] px-3 py-2 rounded-t-2xl rounded-br-2xl max-w-[80%]">
        <Text className="text-black text-base">{text}</Text>
        {tasks.length > 0 && <AiTaskList tasks={tasks} />}
      </View>
    </View>
  );
}
