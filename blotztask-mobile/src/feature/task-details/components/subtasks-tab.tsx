import { View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import React from "react";
import { ASSETS, LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import LottieView from "lottie-react-native";

type SubtaskTabProps = {
  taskId: number;
};

const SubtasksTab = ({ taskId }: SubtaskTabProps) => {
  const { breakDownTask, isBreakingDown, breakDownError } = useSubtaskMutations();

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
      </View>

      <Pressable
        onPress={() => {
          if (!isBreakingDown) breakDownTask(taskId);
        }}
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
