import { View, Text, TouchableOpacity, Alert } from "react-native";
import React, { useState } from "react";
import { theme } from "@/shared/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { useSubtasksByParentId } from "@/feature/task-details/hooks/useSubtasksByParentId";
import { DraggableSubtaskList } from "@/feature/task-details/components/draggable-subtask-list";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

type SubtasksEditorProps = {
  parentTask: TaskDetailDTO;
};

const SubtasksEditor = ({ parentTask }: SubtasksEditorProps) => {
  const { data: fetchedSubtasks, isLoading } = useSubtasksByParentId(parentTask.id);

  const {
    breakDownTask,
    isBreakingDown,
    replaceSubtasks,
    isReplacingSubtasks,
    deleteSubtask,
    isDeletingSubtask,
    isUpdatingSubtask,
    toggleSubtaskStatus,
  } = useSubtaskMutations();

  const [isEditMode, setIsEditMode] = useState(false);
  const taskColor = parentTask?.label?.color ?? theme.colors.disabled;

  const onBack = () => {
    setIsEditMode(false);
  };

  const handleRefresh = async () => {
    try {
      const newSubtasks = await breakDownTask(parentTask.id);
      if (newSubtasks && newSubtasks.length > 0) {
        await replaceSubtasks({
          taskId: parentTask.id,
          subtasks: newSubtasks,
        });
      }
    } catch (error) {
      console.error("Failed to refresh subtasks:", error);
      // TODO: Implement error screen
      Alert.alert("Error", "Failed to refresh subtasks. Please try again.");
    }
  };

  const handleEdit = () => {
    setIsEditMode(!isEditMode);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSubtask({ subtaskId: id, parentTaskId: parentTask.id });
    } catch (error) {
      console.error("Failed to delete subtask:", error);
      Alert.alert("Error", "Failed to delete subtask.");
    }
  };

  if (
    isLoading ||
    isBreakingDown ||
    isReplacingSubtasks ||
    isDeletingSubtask ||
    isUpdatingSubtask
  ) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base font-baloo text-primary">Loading subtasks...</Text>
      </View>
    );
  }

  if (!fetchedSubtasks || fetchedSubtasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base font-baloo text-primary">No subtasks yet</Text>
        <TouchableOpacity onPress={onBack} className="mt-4">
          <Text className="text-blue-500 font-balooSemiBold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Top Action Bar */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="font-balooBold text-xl text-[#3E4A5A]">
          Subtasks
        </Text>
        <View className="flex-row items-center mr-1">
        {isEditMode ? (
          <TouchableOpacity onPress={onBack} className="p-2">
            <MaterialIcons name="arrow-back" size={28} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleRefresh} className="p-2">
            <MaterialIcons name="sync" size={24} />
          </TouchableOpacity>
        )}
        {isEditMode ? (
          <TouchableOpacity
            onPress={handleEdit}
            className="px-6 py-2 rounded-lg items-center justify-center"
          >
            <Text className="font-balooSemiBold text-base text-[#3d8de0]">Complete</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleEdit}>
            <MaterialIcons name="reorder" size={24} />
          </TouchableOpacity>
        )}
        </View>
      </View>

      {/* Subtasks List */}
      <View className="flex-1">
        <DraggableSubtaskList
          subtasks={fetchedSubtasks}
          isEditMode={isEditMode}
          onDelete={handleDelete}
          onToggle={(subtaskId) => toggleSubtaskStatus({ subtaskId, parentTaskId: parentTask.id })}
          color={taskColor}
        />
      </View>

      {/* Add More Subtasks Button / Drag to Reorder - Fixed at bottom */}
      {isEditMode ?? (
        <View className="mx-0 mb-10 mt-4 rounded-2xl py-2.5 items-center justify-center">
          <Text className="font-baloo text-[#8BC34A] text-lg text-center">Drag to reorder~</Text>
        </View>
      )}
    </View>
  );
};

export default SubtasksEditor;
