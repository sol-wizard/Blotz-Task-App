import React, { useState } from "react";
import { Text, View } from "react-native";
import { Checkbox } from "react-native-paper";

type Task = {
  id: number;
  title: string;
};

export default function ReturnedTasksList({ tasks }: { tasks: Task[] }) {
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
    <View className="mt-3 ml-10 bg-white rounded-xl shadow px-4 py-3 space-y-2">
      {tasks.map((task) => (
        <View key={task.id} className="flex-row items-center ">
          <View className="border border-[#898c91] rounded-full p-0.2 my-1 bg-gray-100">
            <Checkbox
              status={checkedTasks.includes(task.id) ? "checked" : "unchecked"}
              onPress={() => toggleTask(task.id)}
              color="#3b82f6"
              uncheckedColor="#898c91"
            />
          </View>

          <Text className="text-gray-600 text-sm ml-3">{task.title}</Text>
        </View>
      ))}
    </View>
  );
}
