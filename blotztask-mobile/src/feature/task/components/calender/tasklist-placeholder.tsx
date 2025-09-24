import React from "react";
import { View, Text } from "react-native";
import LottieView from "lottie-react-native";
import emptyBoxAnimation from "../../../../../assets/images/empty-box.json";

interface TaskListPlaceholderProps {
  selectedStatus: string;
}
interface EmptyStateContent {
  title: string;
  description: string;
}

const EMPTY_STATES: Record<string, EmptyStateContent> = {
  all: {
    title: "No tasks for this day",
    description: "Your task list is empty. Wanna create a new task?",
  },
  todo: {
    title: "No tasks to do",
    description: "All caught up! Add a new task to get started.",
  },
  done: {
    title: "No completed tasks",
    description: "Complete some tasks to see them here.",
  },
};

const DEFAULT_STATE: EmptyStateContent = {
  title: "No tasks found",
  description: "Try adjusting your filter or add a new task.",
};

export function TaskListPlaceholder({ selectedStatus }: TaskListPlaceholderProps) {
  const content = EMPTY_STATES[selectedStatus] || DEFAULT_STATE;
  return (
    <View className="flex-1 items-center justify-center px-4">
      <LottieView
        source={emptyBoxAnimation}
        autoPlay
        loop
        style={{ width: 160, height: 160, marginBottom: 16 }}
      />
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">{content.title}</Text>
      <Text className="text-gray-500 text-center max-w-xs">{content.description}</Text>
    </View>
  );
}
