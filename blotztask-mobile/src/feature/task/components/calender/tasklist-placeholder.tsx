import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import emptyBoxAnimation from "../../../../../assets/images/empty-box.json";

interface TaskListPlaceholderProps {
  selectedStatus: string;
}

interface EmptyStateContent {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}

const FILTERED_EMPTY_STATES: Record<string, EmptyStateContent> = {
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

function AllTasksEmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-4">
      <LottieView
        source={emptyBoxAnimation}
        autoPlay
        loop
        style={{ width: 160, height: 160, marginBottom: 16 }}
      />
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
        No tasks for this day
      </Text>
      <Text className="text-gray-500 text-center max-w-xs">
        Your to do list is empty. Wanna create a new one?
      </Text>
    </View>
  );
}

function FilteredTasksEmptyState({ content }: { content: EmptyStateContent }) {
  return (
    <View className="flex-1 items-center justify-center px-4">
      <MaterialCommunityIcons
        name={content.icon}
        size={48}
        color="#9CA3AF"
        style={{ marginBottom: 16 }}
      />
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">{content.title}</Text>
      <Text className="text-gray-500 text-center max-w-xs">{content.description}</Text>
    </View>
  );
}

export function TaskListPlaceholder({ selectedStatus }: TaskListPlaceholderProps) {
  // Handle "all" status separately with Lottie animation
  if (selectedStatus === "all") {
    return <AllTasksEmptyState />;
  }

  // Handle other statuses with icons
  const content = FILTERED_EMPTY_STATES[selectedStatus] || DEFAULT_STATE;
  return <FilteredTasksEmptyState content={content} />;
}
