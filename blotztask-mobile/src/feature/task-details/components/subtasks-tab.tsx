import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import SubtaskItem from "./subtask-item";
import { useSelectedTaskStore } from "@/shared/stores/selected-task-store";
import { theme } from "@/shared/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";

// Mock data for subtasks
const MOCK_SUBTASKS = [
  {
    id: 1,
    title: "Research user requirements",
    description: "Gather and analyze user feedback",
    duration: "02:00:00",
    isDone: true,
  },
  {
    id: 2,
    title: "Design mockups",
    description: "Create wireframes and high-fidelity designs",
    duration: "03:30:00",
    isDone: false,
  },
  {
    id: 3,
    title: "Implement frontend components",
    description: "Build React components for the UI",
    duration: "05:00:00",
    isDone: false,
  },
  {
    id: 4,
    title: "Write unit tests",
    description: "Test all new components",
    duration: "01:30:00",
    isDone: false,
  },
  {
    id: 5,
    title: "Write unit tests",
    description: "Test all new components",
    duration: "01:30:00",
    isDone: false,
  },
  {
    id: 6,
    title: "Write unit tests",
    description: "Test all new components",
    duration: "01:30:00",
    isDone: false,
  },
  {
    id: 7,
    title: "Write unit tests",
    description: "Test all new components",
    duration: "01:30:00",
    isDone: false,
  },
  {
    id: 8,
    title: "Write unit tests",
    description: "Test all new components",
    duration: "01:30:00",
    isDone: false,
  },
];

const SubtasksTab = () => {
  const [subtasks, setSubtasks] = useState(MOCK_SUBTASKS);
  const [isEditMode, setIsEditMode] = useState(false);
  const { selectedTask } = useSelectedTaskStore();
  const taskColor = selectedTask?.label?.color ?? theme.colors.disabled;

  const handleToggle = (id: number) => {
    setSubtasks((prev) =>
      prev.map((subtask) =>
        subtask.id === id ? { ...subtask, isDone: !subtask.isDone } : subtask
      )
    );
  };

  const handleRefresh = () => {
    // TODO: Implement refresh functionality
    console.log("Refresh subtasks");
  };

  const handleEdit = () => {
    setIsEditMode(!isEditMode);
    console.log("Edit mode:", !isEditMode);
  };

  const handleAddSubtask = () => {
    // TODO: Implement add subtask functionality
    console.log("Add more subtasks");
  };

  if (subtasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base font-baloo text-tertiary">No subtasks yet</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Top Action Bar */}
      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity onPress={handleRefresh} className="p-2">
          <MaterialIcons name="sync" size={28} color={theme.colors.heading} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleEdit}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.colors.heading }}
        >
          <MaterialIcons name="edit" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Subtasks List */}
      <View className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
          {subtasks.map((subtask) => (
            <SubtaskItem key={subtask.id} item={subtask} onToggle={handleToggle} color={taskColor} />
          ))}
        </ScrollView>
      </View>

      {/* Add More Subtasks Button - Fixed at bottom */}
      <TouchableOpacity
        onPress={handleAddSubtask}
        className="mx-0 mb-20 mt-4 rounded-2xl"
        style={{
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: theme.colors.dashline,
          paddingVertical: 10,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          className="py font-baloo"
          style={{ 
            color: theme.colors.dashline,
            fontSize: 18,
            textAlign: "center",
          }}
        >
          Add more subtasks
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SubtasksTab;
