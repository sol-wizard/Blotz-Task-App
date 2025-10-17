import { Hanging } from "@/shared/components/common/hanging";
import React from "react";
import { View, Text, Pressable, ScrollView, SafeAreaView } from "react-native";
import { TaskStatusSelectItem } from "../modals/task-status-select-item";
import { TaskStatusType } from "../modals/task-status-type";

export function TaskStatusSelect({
  statuses,
  selectedStatusId,
  onChange,
}: {
  statuses: TaskStatusSelectItem[];
  selectedStatusId: TaskStatusType;
  onChange: (value: TaskStatusType) => void;
}) {
  return (
    <SafeAreaView>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2 px-4 items-center py-4">
          {statuses.map((statusItem) => {
            const isSelected = selectedStatusId === statusItem.id;

            // Urgent: change to seperate button, no for loop

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
