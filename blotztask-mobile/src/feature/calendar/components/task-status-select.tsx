import { Hanging } from "@/shared/components/common/hanging";
import React from "react";
import { View, Text, Pressable, ScrollView, SafeAreaView } from "react-native";

export interface TaskStatusSelectItem {
  id: TaskStatusType;
  status: string;
  count: number;
}

export interface TaskStatusSelectProps {
  statuses: TaskStatusSelectItem[];
  selectedStatusId: TaskStatusType;
  onChange: (value: TaskStatusType) => void;
}

export type TaskStatusType = "all" | "todo" | "inprogress" | "done" | "overdue";

export function TaskStatusSelect({
  statuses: taskStatuses,
  selectedStatusId: selectedStatusId,
  onChange,
}: TaskStatusSelectProps) {
  return (
    <SafeAreaView>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2 px-4 items-center py-4">
          {taskStatuses.map((statusItem) => {
            const isSelected = selectedStatusId === statusItem.id;

            return (
              <Hanging active={isSelected} key={statusItem.id}>
                <Pressable
                  onPress={() => onChange(statusItem.id)}
                  className={`flex-row items-center gap-2 px-4 py-2 rounded-xl border ${
                    isSelected ? "bg-black" : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-sm ${isSelected ? "text-white font-extrabold" : "text-gray-700"}`}
                  >
                    {statusItem.status}
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${isSelected ? "bg-white" : "bg-gray-400"}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${isSelected ? "text-black font-bold" : "text-white"}`}
                    >
                      {statusItem.count}
                    </Text>
                  </View>
                </Pressable>
              </Hanging>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
