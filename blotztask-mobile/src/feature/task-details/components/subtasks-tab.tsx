import { View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import React, { useState } from "react";
import { ASSETS, LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import LottieView from "lottie-react-native";

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

  const [generatedSubtasks, setGeneratedSubtasks] = useState<
    { order: number; title: string; duration: string }[]
  >([]);

  const handleBreakDown = async () => {
    if (isBreakingDown) return;
    try {
      const subtasks = await breakDownTask(taskId);
      if (subtasks && Array.isArray(subtasks)) {
        setGeneratedSubtasks(subtasks);
      }
    } catch {
      // error handled by breakDownError
    }
  };

  const handleAddSubtasks = () => {
    if (generatedSubtasks.length === 0) return;
    addSubtasks({
      taskId,
      subtasks: generatedSubtasks.map((subtask) => ({
        ...subtask,
        isDone: false,
      })),
    });
  };

  return (
    <View>
      <View className="mt-4 p-4 bg-[#F5F9FA] rounded-3xl">
        <Text className="font-balooBold text-xl text-blue-500">
          {isBreakingDown
            ? "Breaking your tasks into tiny bite-sized pieces~"
            : "Big tasks can feel heavy. Try breaking them into bite-sized actions."}
        </Text>
        {isBreakingDown && (
          <LottieView
            source={LOTTIE_ANIMATIONS.dotsLoader}
            autoPlay
            loop
            style={{ width: 50, height: 50 }}
          />
        )}
        <Image source={ASSETS.greenBun} className="w-15 h-15 self-end" />
        {generatedSubtasks.length > 0 && (
          <View className="mt-4">
            {generatedSubtasks.map((subtask) => (
              <View
                key={subtask.order}
                className="flex-row justify-between p-2 border-b border-gray-300"
              >
                <Text className="font-semibold">{subtask.order}.</Text>
                <Text className="flex-1 mx-2">{subtask.title}</Text>
                <Text className="text-gray-600">{subtask.duration}</Text>
              </View>
            ))}
            <Pressable
              onPress={handleAddSubtasks}
              disabled={isAddingSubtasks}
              className={`mt-4 rounded-3xl h-[45px] w-[140px] self-center flex-row items-center justify-center ${
                isAddingSubtasks ? "bg-gray-300" : "bg-[#EBF0FE] active:bg-gray-100"
              }`}
            >
              {isAddingSubtasks ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text className="text-blue-500 text-lg font-balooBold">Add to task</Text>
              )}
            </Pressable>
            {addSubtasksError && (
              <Text className="text-red-500 text-center mt-3">
                Failed to add subtasks. Please try again.
              </Text>
            )}
          </View>
        )}
      </View>

      <Pressable
        onPress={handleBreakDown}
        disabled={isBreakingDown}
        className={`flex-row items-center justify-center self-center mt-8 rounded-3xl h-[55px] w-[180px] ${
          isBreakingDown ? "bg-gray-300" : "bg-[#EBF0FE] active:bg-gray-100"
        }`}
      >
        {isBreakingDown ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : (
          <>
            <MaterialCommunityIcons name="format-list-checkbox" size={24} color="#3b82f6" />
            <Text className="ml-2 text-blue-500 text-xl font-balooBold">Breakdown</Text>
          </>
        )}
      </Pressable>

      {breakDownError && (
        <Text className="text-red-500 text-center mt-3">
          Failed to generate subtasks. Please try again.
        </Text>
      )}
    </View>
  );
};

export default SubtasksTab;
