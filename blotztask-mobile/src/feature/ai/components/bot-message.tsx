import React from "react";
import { Task, Text, View } from "react-native";
import ReturnedTasksList from "./returned-tasks-list";
import { TaskDetailDTO } from "../models/tasks";

export default function BotMessage({
  text,
  tasks = [],
}: {
  text: string;
  tasks?: TaskDetailDTO[];
}) {
  return (
    <View className="flex-col mb-3">
      <View className="flex-row items-end justify-start">
        <View className="bg-[#F2F2F7] px-3 py-2 rounded-t-lg rounded-br-lg max-w-[80%]">
          <Text className="text-black text-base">{text}</Text>
          {tasks.length > 0 && <ReturnedTasksList tasks={tasks} />}
        </View>
      </View>
    </View>
  );
}
