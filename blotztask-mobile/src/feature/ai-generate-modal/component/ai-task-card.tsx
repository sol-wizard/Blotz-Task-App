import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AiTaskDTO } from "@/feature/ai-chat-hub/models/ai-task-dto";

type Props = {
  task: AiTaskDTO;
  handleTaskDelete: (taskId: string) => void;
};

export function AiTaskCard({ task, handleTaskDelete }: Props) {
  return (
    <View className="bg-white rounded-lg flex-row items-center shadow w-80 h-20 justify-between px-3 my-3">
      <Text numberOfLines={1} className="text-lg font-semibold text-[#2F3640]">
        {task.title}
      </Text>

      <Pressable
        onPress={() => handleTaskDelete(task.id)}
        hitSlop={10}
        className="items-center justify-center w-8 h-8 rounded-full"
        android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
      >
        <MaterialCommunityIcons name={"close"} size={20} color="#2F3640" />
      </Pressable>
    </View>
  );
}
