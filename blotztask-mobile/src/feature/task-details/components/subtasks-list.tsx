import { View, Text, TouchableOpacity, Alert } from "react-native";
import React, { useState} from "react";
import { theme } from "@/shared/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import { useSubtasksByParentId } from "@/feature/task-details/hooks/useSubtasksByParentId";
import { DraggableSubtaskList } from "@/feature/task-details/components/draggable-subtask-list";

type SubtasksListProps = {
  taskId: number;
};

const SubtasksList = ({ taskId }: SubtasksListProps) => {
  const { selectedTask } = useTaskById({ taskId });
  const { data: fetchedSubtasks, isLoading, isError, refetch } = useSubtasksByParentId(taskId);

  const {
    breakDownTask,
    isBreakingDown,
    replaceSubtasks: replaceSubtasks,
    isReplacingSubtasks: isReplacingSubtasks,
  } = useSubtaskMutations();

  const [isEditMode, setIsEditMode] = useState(false);
  const taskColor = selectedTask?.label?.color ?? theme.colors.disabled;

  const onBack = () => {
    setIsEditMode(false);
  };

  const handleToggle = (id: number) => {
    // Optimistically update the UI using React Query's cache
    // TODO: Create a mutation hook to update backend
    // queryClient.setQueryData(['subtasks', taskId], (old) =>
    //   old?.map(subtask => subtask.taskId === id ? {...subtask, isDone: !subtask.isDone} : subtask)
    // );
    console.log("TODO: Implement toggle mutation");
  };

  const handleRefresh = async () => {
    try {
      const newSubtasks = await breakDownTask(taskId);
      if (newSubtasks && newSubtasks.length > 0) {
        await replaceSubtasks({
          taskId,
          subtasks: newSubtasks,
        });
      }
    } catch (error) {
      console.error("Failed to refresh subtasks:", error);
      Alert.alert("Error", "Failed to refresh subtasks. Please try again.");
    }
  };

  const handleEdit = () => {
    setIsEditMode(!isEditMode);
    console.log("Edit mode:", !isEditMode);
  };

  const handleAddSubtask = () => {
    // TODO: add delete screen
    console.log("Implement add subtask");
  };

  const handleDelete = (id: number) => {
    // TODO: add delete screen
    console.log("Implement delete subtask");
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (!fetchedSubtasks) return;

    const newSubtasks = [...fetchedSubtasks];
    const [movedItem] = newSubtasks.splice(fromIndex, 1);
    newSubtasks.splice(toIndex, 0, movedItem);

    // Update with new order
    const reorderedSubtasks = newSubtasks.map((subtask, index) => ({
      ...subtask,
      order: index + 1,
    }));

    // TODO: Create a reorder mutation hook
    // updateSubtasksOrder(reorderedSubtasks) - React Query will handle cache update
    console.log("TODO: Implement reorder mutation", reorderedSubtasks);
  };

  if (isLoading || isBreakingDown || isReplacingSubtasks) {
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
            <MaterialIcons name="sync" size={28}/>
          </TouchableOpacity>
        )}
        {isEditMode ? (
          <TouchableOpacity
            onPress={handleEdit}
            className="px-6 py-2 rounded-lg items-center justify-center"
          >
            <Text className="font-balooSemiBold text-base text-[#3d8de0]">
              Complete
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleEdit}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <MaterialIcons name="edit" size={20} />
          </TouchableOpacity>
        )}
      </View>

      {/* Subtasks List */}
      <View className="flex-1">
        <DraggableSubtaskList subtasks={fetchedSubtasks}/>
      </View>

      {/* Add More Subtasks Button / Drag to Reorder - Fixed at bottom */}
      {isEditMode ? (
        <View
          className="mx-0 mb-20 mt-4 rounded-2xl py-2.5 items-center justify-center"
        >
          <Text
            className="font-baloo text-[#8BC34A] text-lg text-center"
          >
            Drag to reorder~
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleAddSubtask}
          className="mx-0 mb-20 mt-4 rounded-2xl border-2 border-dashed py-2.5 items-center justify-center border-[#8c8c8c]"
        >
          <Text
            className="font-baloo text-lg text-center"
          >
            Add more subtasks
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SubtasksList;
