import React, { useState } from "react";
import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons"; // Ensure you have this package installed
import { TaskDetailDTO } from "../models/tasks";
import { IconButton } from "react-native-paper";

export default function ReturnedTasksList({
  tasks,
}: {
  tasks: TaskDetailDTO[];
}) {
  const [checkedTasks, setCheckedTasks] = useState<number[]>([]);

  const toggleTask = (taskId: number) => {
    setCheckedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  if (tasks.length === 0) return null;

  return (
    <View className="items-start mt-2">
      {tasks.map((task) => (
        <View className="flex-row w-full items-center justify-between">
          <View
            key={task.id}
            className="flex-row items-center rounded-lg bg-white mb-3 px-3 py-2 flex-1"
          >
            <View className="w-[3px] bg-gray-300 h-full min-h-[40px] mr-4 rounded-md" />
            <View className="flex-col">
              <Text className="text-base font-semibold">{task.title}</Text>
              <View className="flex-row my-1">
                <MaterialIcons name="schedule" size={20} color="#AEAEB2" />
                <Text className="text-base text-[#AEAEB2] ml-2">
                  10:00am-11:00am
                </Text>
              </View>
            </View>
          </View>
          <IconButton
            icon="trash-can-outline"
            mode="outlined"
            size={20}
            iconColor="#8E8E93"
            style={{
              borderColor: "#8E8E93",
            }}
          />
        </View>
      ))}
    </View>
  );
}
