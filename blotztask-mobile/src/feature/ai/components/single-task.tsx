import { View, Text } from "react-native";
import { TaskDetailDTO } from "../models/tasks";

interface SingleTaskProps {
  task: TaskDetailDTO;
}

export const SingleTask = ({ task }: SingleTaskProps) => {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 shadow-md">
      <Text className="text-lg font-semibold text-gray-800 mb-2">
        {task.title}
      </Text>
      <Text className="text-sm text-gray-600 mb-2">{task.description}</Text>
      <Text className="text-xs text-blue-500">
        📅 Due: {task.dueDate.toDateString()}
      </Text>
    </View>
  );
};
