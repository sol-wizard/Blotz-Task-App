import React from "react";
import { View, Text } from "react-native";
import { BreakdownTaskCard } from "./breakdown-task-card";
import { AddSubtaskDTO } from "../models/addSubtaskDTO";

interface BreakdownBotMessageProps {
  text: string;
  parentTaskId: string;
  subtasks?: AddSubtaskDTO[];
  openAddSubtaskBottomSheet: (subTask: AddSubtaskDTO) => void;
}

export default function BreakdownBotMessage({
  text,
  subtasks,
  openAddSubtaskBottomSheet,
}: BreakdownBotMessageProps) {
  return (
    <View className="mb-4">
      <View className="p-3 rounded-lg mr-12">
        <View className="bg-[#F2F2F7] px-3 py-2 rounded-t-2xl rounded-br-2xl max-w-[80%]">
          <Text className="text-black text-base">{text}</Text>
        </View>

        {subtasks && subtasks.length > 0 && (
          <View className="mt-3">
            {subtasks.map((subtask, index) => (
              <BreakdownTaskCard
                key={index}
                subTask={subtask}
                openAddSubtaskBottomSheet={openAddSubtaskBottomSheet}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
