import { View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import React from "react";
import { ASSETS } from "@/shared/constants/assets";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { useSubtasksByParentId } from "../hooks/useSubtasksByParentId";
import { BreakdownSubtaskDTO } from "@/feature/task-details/models/breakdown-subtask-dto";
import { AddSubtaskDTO } from "@/feature/task-details/models/add-subtask-dto";
import SubtasksEditor from "./subtasks-editor";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

type SubtaskViewProps = {
  parentTask: TaskDetailDTO;
};

const SubtasksView = ({ parentTask }: SubtaskViewProps) => {
  const {
    breakDownTask,
    isBreakingDown,
    breakDownError,
    replaceSubtasks,
    isReplacingSubtasks,
    replaceSubtasksError,
  } = useSubtaskMutations();

  const {
    data: fetchedSubtasks,
    isLoading: isLoadingSubtasks,
    isError: isFetchingSubtasksError,
  } = useSubtasksByParentId(parentTask.id);

  const displaySubtasks = fetchedSubtasks || [];
  const hasSubtasks = displaySubtasks.length > 0;

  const handleBreakDown = async () => {
    if (isBreakingDown || isReplacingSubtasks) return;
    try {
      const subtasks: BreakdownSubtaskDTO[] = (await breakDownTask(parentTask.id)) ?? [];
      if (subtasks.length > 0) {
        await replaceSubtasks({
          taskId: parentTask.id,
          subtasks: subtasks.map((subtask: AddSubtaskDTO) => ({ ...subtask })),
        });
      }
    } catch {
      console.error(breakDownError || replaceSubtasksError);
    }
  };

  const isLoading = isBreakingDown || isReplacingSubtasks || isLoadingSubtasks;

  // Show loading state while fetching
  if (isLoadingSubtasks) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-500 font-baloo">Loading subtasks...</Text>
      </View>
    );
  }

  // Show manage view if subtasks exist
  if (hasSubtasks) {
    return <SubtasksEditor parentTask={parentTask} />;
  }

  // Show initial breakdown view if no subtasks exist yet
  return (
    <View>
      <View className="mt-4 p-4 bg-[#F5F9FA] rounded-3xl">
        <Text className="font-balooBold text-xl text-blue-500">
          {isLoading
            ? "Breaking your tasks into tiny bite-sized pieces~"
            : "Big tasks can feel heavy. Try breaking them into bite-sized actions."}
        </Text>
        <Image source={ASSETS.greenBun} className="w-15 h-15 self-end" />
      </View>

      <Pressable
        onPress={handleBreakDown}
        disabled={isLoading}
        className={`flex-row items-center justify-center self-center mt-8 rounded-3xl h-[55px] w-[180px] ${
          isLoading ? "bg-gray-300" : "bg-[#EBF0FE] active:bg-gray-100"
        }`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : (
          <>
            <MaterialCommunityIcons name="format-list-checkbox" size={24} color="#3b82f6" />
            <Text className="ml-2 text-blue-500 text-xl font-balooBold">Breakdown</Text>
          </>
        )}
      </Pressable>

      {(breakDownError || replaceSubtasksError || isFetchingSubtasksError) && (
        <Text className="text-red-500 text-center mt-3">
          {isFetchingSubtasksError
            ? "Failed to load subtasks."
            : "Failed to generate or replace subtasks. Please try again."}
        </Text>
      )}
    </View>
  );
};

export default SubtasksView;
