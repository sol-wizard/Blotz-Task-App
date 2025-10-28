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
  const {
    data: fetchedSubtasks,
    isLoading,
    isError,
    refetch,
  } = useSubtasksByParentId(parentTask.id);

  const {
    breakDownTask,
    isBreakingDown,
    replaceSubtasks,
    isReplacingSubtasks,
    deleteSubtask,
    isDeletingSubtask,
    updateSubtask,
    isUpdatingSubtask,
  } = useSubtaskMutations();

  const [isEditMode, setIsEditMode] = useState(false);
  const taskColor = parentTask?.label?.color ?? theme.colors.disabled;

  const onBack = () => {
    setIsEditMode(false);
  };

  const handleToggle = async (id: number) => {
    const subtask = fetchedSubtasks?.find((s) => s.subTaskId === id);
    if (subtask) {
      try {
        await updateSubtask({
          ...subtask,
          isDone: !subtask.isDone,
        });
      } catch (error) {
        console.error("Failed to toggle subtask:", error);
        // TODO: Implement error screen
        Alert.alert("Error", "Failed to update subtask. Please try again.");
      }
    }
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

  const handleAddSubtask = () => {
    // TODO: implement add subtask logic
    console.log("Implement add subtask");
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
        <Text className="text-base font-baloo text-tertiary">Loading subtasks...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base font-baloo text-red-500">Failed to load subtasks</Text>
        <TouchableOpacity onPress={() => refetch()} className="mt-4">
          <Text className="text-blue-500 font-balooSemiBold">Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} className="mt-2">
          <Text className="text-gray-500 font-baloo">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!fetchedSubtasks || fetchedSubtasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base font-baloo text-tertiary">No subtasks yet</Text>
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

      {/* Subtasks List */}
      <View className="flex-1">
        <DraggableSubtaskList
          subtasks={fetchedSubtasks}
          isEditMode={isEditMode}
          onDelete={handleDelete}
          onToggle={handleToggle}
          color={taskColor}
        />
      </View>

      {/* Add More Subtasks Button / Drag to Reorder - Fixed at bottom */}
      {isEditMode ? (
        <View className="mx-0 mb-10 mt-4 rounded-2xl py-2.5 items-center justify-center">
          <Text className="font-baloo text-[#8BC34A] text-lg text-center">Drag to reorder~</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleAddSubtask}
          className="mx-0 mb-10 mt-4 rounded-2xl border-2 border-dashed py-2.5 items-center justify-center border-[#8c8c8c]"
        >
          <Text className="font-baloo text-lg text-center">Add more subtasks</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SubtasksEditor;
