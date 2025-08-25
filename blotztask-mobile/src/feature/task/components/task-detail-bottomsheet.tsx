import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
} from "react";
import { View, TouchableOpacity } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Button, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { router } from "expo-router";
import { TaskDetailTag } from "./task-detail-tag";

export type TaskDetailBottomSheetHandle = {
  present: () => void;
  dismiss: () => void;
};

type TaskDetailBottomSheetProps = {
  task?: TaskDetailDTO;
  onDismiss?: () => void;
  onChange?: (index: number) => void;
};

const TaskDetailBottomSheet = forwardRef<
  TaskDetailBottomSheetHandle,
  TaskDetailBottomSheetProps
>(({ task, onDismiss, onChange }, ref) => {
  const taskDetailModalRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => taskDetailModalRef.current?.present(),
    dismiss: () => taskDetailModalRef.current?.dismiss(),
  }));

  const snapPoints = ["60%", "80%"];

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.5}
      />
    ),
    []
  );

  const handleAiBreakdown = () => {
    if (!task) return;
    taskDetailModalRef.current?.dismiss();

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
    <BottomSheetModal
      ref={taskDetailModalRef}
      snapPoints={snapPoints}
      onDismiss={onDismiss}
      onChange={onChange}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
    >
      <BottomSheetView className="flex-1 bg-white px-4 pt-3 pb-24">
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

            <View className="flex-row items-center mb-3 gap-2 mt-1">
              {task.label ? (
                <TaskDetailTag>{task.label.name}</TaskDetailTag>
              ) : null}
              <TaskDetailTag>
                {task.isDone ? "Done" : "In progress"}
              </TaskDetailTag>
            </View>

            <View className="h-px bg-gray-200 mb-3" />

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
    </BottomSheetModal>
  );
});

TaskDetailBottomSheet.displayName = "TaskDetailBottomSheet";

export default TaskDetailBottomSheet;
