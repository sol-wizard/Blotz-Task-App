import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface TaskListPlaceholderProps {
  selectedStatus: string;
}

// TODO: Add more empty states instead of using default
export function TaskListPlaceholder({ selectedStatus: selectedStatus }: TaskListPlaceholderProps) {
  const getEmptyStateContent = () => {
    switch (selectedStatus) {
      case "todo":
        return {
          icon: "format-list-checks" as const,
          title: "No tasks to do",
          description: "All caught up! Add a new task to get started.",
        };
      case "done":
        return {
          icon: "check-circle" as const,
          title: "No completed tasks",
          description: "Complete some tasks to see them here.",
        };
      default:
        return {
          icon: "format-list-checks" as const,
          title: "No tasks found",
          description: "Try adjusting your filter or add a new task.",
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <View className="flex-1 items-center justify-center px-4">
      <MaterialCommunityIcons name={content.icon} size={48} color="#9CA3AF" className="mb-4" />
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">{content.title}</Text>
      <Text className="text-gray-500 text-center max-w-xs">{content.description}</Text>
    </View>
  );
}
