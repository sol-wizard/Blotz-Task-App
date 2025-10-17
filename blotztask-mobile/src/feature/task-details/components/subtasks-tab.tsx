import { View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import React, { useState, useEffect } from "react";
import { ASSETS, LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { useSubtaskQueries } from "../hooks/useSubtaskQueries";
import LottieView from "lottie-react-native";
import { BreakdownSubtaskDTO } from "@/feature/breakdown/models/breakdown-subtask-dto";
import { AddSubtaskDTO } from "@/feature/breakdown/models/add-subtask-dto";
import SubtasksManage from "./subtasks-manage";

type SubtaskTabProps = {
  taskId: number;
};

const SubtasksTab = ({ taskId }: SubtaskTabProps) => {
  const {
    breakDownTask,
    isBreakingDown,
    breakDownError,
    addSubtasks,
    isAddingSubtasks,
    addSubtasksError,
  } = useSubtaskMutations();

  const { useSubtasksByParentId } = useSubtaskQueries();
  const {
    data: fetchedSubtasks,
    isLoading: isLoadingSubtasks,
    isError: isFetchingSubtasksError,
  } = useSubtasksByParentId(taskId);

  const displaySubtasks = fetchedSubtasks || [];
  const hasSubtasks = displaySubtasks.length > 0;

  const [showManage, setShowManage] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoadingSubtasks && showManage === null) {
      setShowManage(hasSubtasks);
    }
  }, [hasSubtasks, isLoadingSubtasks, showManage]);

  const handleBreakDown = async () => {
    if (isBreakingDown || isAddingSubtasks) return;
    try {
      const subtasks: BreakdownSubtaskDTO[] = (await breakDownTask(taskId)) ?? [];
      if (subtasks.length > 0) {
        await addSubtasks({
          taskId,
          subtasks: subtasks.map((subtask: AddSubtaskDTO) => ({ ...subtask })),
        });
        // Directly show manage view after adding subtasks
        setShowManage(true);
      }
    } catch {
      console.error(breakDownError || addSubtasksError);
    }
  };

  const isLoading = isBreakingDown || isAddingSubtasks || isLoadingSubtasks;

  // Show loading state while fetching or determining view
  if (isLoadingSubtasks || showManage === null) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-500 font-baloo">Loading subtasks...</Text>
      </View>
    );
  }

  // Show manage view if requested or if subtasks exist
  if (showManage && hasSubtasks) {
    return <SubtasksManage taskId={taskId} />;
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
        {isLoading && (
          <LottieView
            source={LOTTIE_ANIMATIONS.dotsLoader}
            autoPlay
            loop
            style={{ width: 50, height: 50 }}
          />
        )}
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

      {(breakDownError || addSubtasksError || isFetchingSubtasksError) && (
        <Text className="text-red-500 text-center mt-3">
          {isFetchingSubtasksError
            ? "Failed to load subtasks."
            : "Failed to generate or add subtasks. Please try again."}
        </Text>
      )}
    </View>
  );
};

export default SubtasksTab;
