import React, { useCallback, useRef } from "react";
import { View, Pressable, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Button, Text, Portal } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { router } from "expo-router";
import TaskDetailTag from "../components/task-detail-tag";

interface TaskDetailBottomSheetProps {
  task?: TaskDetailDTO;
  isVisible: boolean;
  onClose: () => void;
}

const TaskDetailBottomSheet: React.FC<TaskDetailBottomSheetProps> = ({
  task,
  isVisible,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Initial height & snap points
  const snapPoints = ["30%", "60%"];
  const openIndex = 1;

  const handleTaskDetailSheetClose = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose]
  );

  const handleAiBreakdown = () => {
    if (!task) return;

    onClose(); // Close the bottom sheet first
    router.push({
      pathname: "/(protected)/ai-breakdown",
      params: {
        id: task.id,
        title: task.title,
        description: task.description,
      },
    });
  };

  return (
    <Portal>
      <View className="absolute inset-0 z-50">
        {isVisible && (
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => bottomSheetRef.current?.close()}
          />
        )}

        <BottomSheet
          ref={bottomSheetRef}
          index={isVisible ? openIndex : -1}
          snapPoints={snapPoints}
          onChange={handleTaskDetailSheetClose}
          enablePanDownToClose
          backgroundStyle={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <BottomSheetView className="flex-1 bg-white px-4 pt-3 pb-4">
            {task ? (
              <>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text
                    className="flex-1 text-gray-900 mr-3 text-xl leading-6"
                    style={{ fontWeight: "800" }}
                  >
                    {task.title}
                  </Text>

                  <View className="flex-row items-center gap-2">
                    <Button
                      mode="text"
                      onPress={() => console.log("Edit task:", task.id)}
                      textColor="#374151"
                      compact
                      labelStyle={{ fontSize: 15, fontWeight: "bold" }}
                      contentStyle={{ paddingHorizontal: 0 }}
                    >
                      Edit
                    </Button>

                    {/* AI Breakdown capsule */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleAiBreakdown}
                      className="flex-row items-center px-3 py-1.5 bg-white border border-gray-200 rounded-2xl"
                    >
                      <MaterialIcons
                        name="auto-awesome"
                        size={15}
                        color="#9CA3AF"
                      />
                      <Text className="ml-1.5 text-gray-900 text-xs font-bold">
                        AI Breakdown
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Tags */}
                <View className="flex-row items-center mb-3 gap-2 mt-1">
                  {task.label ? (
                    <TaskDetailTag>{task.label.name}</TaskDetailTag>
                  ) : null}
                  <TaskDetailTag>
                    {task.isDone ? "Done" : "In progress"}
                  </TaskDetailTag>
                </View>

                {/* Divider */}
                <View className="h-px bg-gray-200 mb-3" />

                {/* Dates */}
                {task?.startTime ? (
                  <View className="flex-row items-center mb-2">
                    <MaterialIcons name="event" size={18} color="#6B7280" />
                    <Text className="ml-2.5 text-base leading-5 text-gray-900">
                      {task.startTime}
                    </Text>
                    <Text className="ml-2.5 text-base leading-5 text-gray-500">
                      →
                    </Text>
                    {task?.endTime ? (
                      <Text className="ml-2 text-base leading-5 text-gray-900">
                        {task.endTime}
                      </Text>
                    ) : null}
                  </View>
                ) : task?.endTime ? (
                  <View className="flex-row items-center mb-2">
                    <MaterialIcons
                      name="calendar-today"
                      size={18}
                      color="#6B7280"
                    />
                    <Text className="ml-2.5 text-base leading-5 text-gray-900">
                      {task.endTime}
                    </Text>
                  </View>
                ) : null}

                {/* Description */}
                {task.description ? (
                  <View className="flex-row items-start">
                    <MaterialIcons
                      name="description"
                      size={18}
                      color="#6B7280"
                      className="mt-0.5"
                    />
                    <Text className="flex-1 ml-2.5 text-base leading-5 text-gray-900">
                      {task.description}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text>No task selected</Text>
            )}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </Portal>
  );
};

export default TaskDetailBottomSheet;
