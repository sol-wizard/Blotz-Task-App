import { View, Text, TouchableOpacity, Alert } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import React, { useState, useRef } from "react";
import DraggableSubtaskList from "./draggable-subtask-list";
import { theme } from "@/shared/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import { useSubtasksByParentId } from "../hooks/useSubtasksByParentId";

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
  const scrollOffsetRef = useRef(0);
  const taskColor = selectedTask?.label?.color ?? theme.colors.disabled;
  const scrollViewRef = useRef<ScrollView>(null);

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
            <MaterialIcons name="arrow-back" size={28} color={theme.colors.heading} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleRefresh} className="p-2">
            <MaterialIcons name="sync" size={28} color={theme.colors.heading} />
          </TouchableOpacity>
        )}
        {isEditMode ? (
          <TouchableOpacity
            onPress={handleEdit}
            className="px-6 py-2 rounded-lg items-center justify-center"
            style={{ backgroundColor: "#ebf0fe" }}
          >
            <Text className="font-balooSemiBold text-base" style={{ color: "#3d8de0" }}>
              Complete
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleEdit}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.colors.heading }}
          >
            <MaterialIcons name="edit" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Subtasks List */}
      <View className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
          scrollEventThrottle={1}
          onScroll={(event) => {
            const newOffset = event.nativeEvent.contentOffset.y;
            scrollOffsetRef.current = newOffset;
          }}
        >
          <DraggableSubtaskList
            subtasks={fetchedSubtasks}
            onToggle={handleToggle}
            color={taskColor}
            isEditMode={isEditMode}
            onDelete={handleDelete}
            onReorder={handleReorder}
            scrollViewRef={scrollViewRef}
            scrollOffsetRef={scrollOffsetRef}
          />
        </ScrollView>
      </View>

      {/* Add More Subtasks Button / Drag to Reorder - Fixed at bottom */}
      {isEditMode ? (
        <View
          className="mx-0 mb-20 mt-4 rounded-2xl"
          style={{
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            className="py font-baloo"
            style={{
              color: "#8BC34A",
              fontSize: 18,
              textAlign: "center",
            }}
          >
            Drag to reorder~
          </Text>
        </View>
      ) : (
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
      )}
    </View>
  );
};

export default SubtasksList;
