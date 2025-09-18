import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AiTaskDTO } from "@/feature/ai-chat-hub/models/ai-task-dto";
import { formatDateRange } from "../../util/format-date-range";
import { formatSameDayTimeRange } from "../../util/format-same-day-time-range";

export const AiTaskCard = ({ task }: { task: AiTaskDTO }) => {
  const dateRange = formatDateRange({
    startTime: task.startTime,
    endTime: task.endTime,
  });
  const timeRange = formatSameDayTimeRange({
    startTime: task.startTime,
    endTime: task.endTime,
  });

  return (
    <View className="flex-row w-full rounded-2xl bg-white p-4 border border-slate-200 shadow-sm items-center">
      <Pressable onPress={() => console.log("subtask added!")} className="mr-3" hitSlop={8}>
        {task.isAdded ? (
          <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
        ) : (
          <Ionicons name="ellipse-outline" size={22} color="#cbd5e1" />
        )}
      </Pressable>
      <View className="flex-col">
        <Text className="text-[17px] font-semibold text-slate-900 pb-2" numberOfLines={1}>
          {task.title || "Untitled task"}
        </Text>
        {task.description ? (
          <View className="mt-3 rounded-xl bg-sky-50 p-3">
            <Text className="text-[12px] text-slate-500 mb-1">Identify original text:</Text>
            <Text className="text-[13px] text-slate-700">{task.description}</Text>
          </View>
        ) : null}
        <View className="flex-row">
          <Ionicons name="time-outline" size={16} color="#64748b" />
          <Text
            className={`ml-2 text-[14px] ${timeRange === "Add Time" ? "text-slate-500" : "text-slate-700"}`}
          >
            {timeRange}
          </Text>
        </View>
        <View className="flex-row items-center mt-2">
          <Ionicons name="calendar-outline" size={16} color="#64748b" />
          <Text
            className={`ml-2 text-[14px] ${!task.startTime && !task.endTime ? "text-slate-500" : "text-slate-700"}`}
          >
            {dateRange}
          </Text>
        </View>
      </View>
    </View>
  );
};
