import React from "react";
import { View } from "react-native";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";

type SubtaskProgressBarProps = {
  subtasks?: SubtaskDTO[];
};

export const SubtaskProgressBar = ({ subtasks }: SubtaskProgressBarProps) => {
  if (!subtasks || subtasks.length === 0) {
    return null;
  }

  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.isDone).length;

  return (
    <View className="flex-row gap-[6px] h-[8px] mx-5 mb-5">
      {Array.from({ length: total }).map((_, index) => {
        const isFilled = index < completed;
        return (
          <View
            key={index}
            className={`flex-1 h-full rounded-lg ${
              isFilled ? "bg-[#E9F5E9]" : "bg-transparent border border-neutral-300"
            }`}
          />
        );
      })}
    </View>
  );
};
