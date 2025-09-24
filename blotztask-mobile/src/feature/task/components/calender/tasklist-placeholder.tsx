import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import emptyBoxAnimation from "../../../../../assets/images/empty-box.json";

interface TaskListPlaceholderProps {
  selectedStatus: string;
}
interface EmptyStateContent {
  custom?: React.ReactNode;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}
// TODO: Add more empty states instead of using default
const EMPTY_STATES: Record<string, EmptyStateContent> = {
  all: {
    custom: (
      <LottieView source={emptyBoxAnimation} autoPlay loop style={{ width: 160, height: 160 }} />
    ),
    title: "No tasks for this day",
    description: "Your to do list is empty. Wanna create a new one?",
  },
  todo: {
    icon: "format-list-checks",
    title: "No tasks to do",
    description: "All caught up! Add a new task to get started.",
  },
  done: {
    icon: "check-circle",
    title: "No completed tasks",
    description: "Complete some tasks to see them here.",
  },
};

const DEFAULT_STATE: EmptyStateContent = {
  icon: "format-list-checks",
  title: "No tasks found",
  description: "Try adjusting your filter or add a new task.",
};

export function TaskListPlaceholder({ selectedStatus }: TaskListPlaceholderProps) {
  const content = EMPTY_STATES[selectedStatus] || DEFAULT_STATE;

  return (
    <View className="flex-1 items-center justify-center px-4">
      {content.custom ? (
        content.custom
      ) : (
        <MaterialCommunityIcons
          name={content.icon!}
          size={48}
          color="#9CA3AF"
          style={{ marginBottom: 16 }}
        />
      )}

      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">{content.title}</Text>
      <Text className="text-gray-500 text-center max-w-xs">{content.description}</Text>
    </View>
  );
}
