import { useRef, useCallback, useState, useEffect } from "react";
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
import { useBottomSheetStore } from "../../util/bottomSheetStore";
import { format, isBefore, startOfDay } from "date-fns";
import SubtaskDetailBottomSheet, {
  SubtaskDetailBottomSheetHandle,
} from "./subtask-detail-bottomsheet";

type TaskDetailBottomSheetProps = {
  task?: TaskDetailDTO;
};

const TaskDetailBottomSheet = ({ task }: TaskDetailBottomSheetProps) => {
  const taskDetailModalRef = useRef<BottomSheetModal>(null);
  const subtaskSheetRef = useRef<SubtaskDetailBottomSheetHandle>(null);

  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(task);
  useEffect(() => {
    setSelectedTask(task);
  }, [task]);

  const { taskDetailOpen, openEditTask, closeTaskDetail } = useBottomSheetStore();
  useEffect(() => {
    if (taskDetailOpen) {
      taskDetailModalRef.current?.present();
    } else {
      taskDetailModalRef.current?.dismiss();
    }
  }, [taskDetailOpen]);

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
    [],
  );

  const handleAiBreakdown = () => {
    if (!task) return;
    taskDetailModalRef.current?.dismiss();

    router.push({
      pathname: "/(protected)/ai-breakdown",
      params: {
        id: task.id,
      },
    });
  };

  const handleEditPress = () => {
    taskDetailModalRef.current?.dismiss();
    openEditTask();
  };

  const openSubtaskDetail = () => {
    subtaskSheetRef.current?.present();
  };

  const mockSubtasks = [
    {
      id: 1,
      subtask: "Define Goals & Project List",
      content: "Define Goals & Project List",
      estimatedDuration: "1h",
      isCompleted: false,
    },
    {
      id: 2,
      subtask: "Content Drafting",
      content: "Define Goals & Project List",
      estimatedDuration: "2h",
      isCompleted: false,
    },
    {
      id: 3,
      subtask: "Visual Asset Preparation",
      content: "Define Goals & Project List",
      estimatedDuration: "2h",
      isCompleted: true,
    },
    {
      id: 4,
      subtask: "Platform Update",
      content: "Define Goals & Project List",
      estimatedDuration: "2h",
      isCompleted: false,
    },
    {
      id: 5,
      subtask: "Review & Resume Alignment",
      content: "Define Goals & Project List",
      estimatedDuration: "1h",
      isCompleted: false,
    },
  ];

  return (
    <>
      <BottomSheetModal
        ref={taskDetailModalRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        onDismiss={closeTaskDetail}
      >
        <BottomSheetView className="flex-1 bg-white px-4 pt-3 pb-24">
          {selectedTask ? (
            <>
              {/* Header */}
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className="flex-1 text-gray-900 mr-3 text-xl leading-6"
                  style={{ fontWeight: "800" }}
                >
                  {selectedTask.title}
                </Text>

                <View className="flex-row items-center gap-2">
                  <Button
                    mode="text"
                    onPress={handleEditPress}
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
                    <MaterialIcons name="auto-awesome" size={15} color="#9CA3AF" />
                    <Text className="ml-1.5 text-gray-900 text-xs font-bold">AI Breakdown</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row items-center mb-3 gap-2 mt-1">
                {selectedTask.label ? (
                  <TaskDetailTag>{selectedTask.label.name}</TaskDetailTag>
                ) : null}
                <TaskDetailTag>
                  {selectedTask.isDone
                    ? "Done"
                    : selectedTask.endTime &&
                        isBefore(new Date(selectedTask.endTime), startOfDay(new Date()))
                      ? "Overdue"
                      : "In progress"}
                </TaskDetailTag>
              </View>

              <View className="h-px bg-gray-200 mb-3" />

              {selectedTask?.startTime ? (
                <View className="flex-row items-center mb-2">
                  <MaterialIcons name="event" size={18} color="#6B7280" />
                  <Text className="ml-2.5 text-base leading-5 text-gray-900">
                    {format(selectedTask.startTime, "yyyy-MM-dd HH:mm")}
                  </Text>
                  <Text className="ml-2.5 text-base leading-5 text-gray-500">→</Text>
                  {selectedTask?.endTime ? (
                    <Text className="ml-2 text-base leading-5 text-gray-900">
                      {format(selectedTask.endTime, "yyyy-MM-dd HH:mm")}
                    </Text>
                  ) : null}
                </View>
              ) : selectedTask?.endTime ? (
                <View className="flex-row items-center mb-2">
                  <MaterialIcons name="calendar-today" size={18} color="#6B7280" />
                  <Text className="ml-2.5 text-base leading-5 text-gray-900">
                    {format(selectedTask.endTime, "yyyy-MM-dd HH:mm")}
                  </Text>
                </View>
              ) : null}

              {selectedTask.description ? (
                <View className="flex-row items-start">
                  <MaterialIcons name="description" size={18} color="#6B7280" className="mt-0.5" />
                  <Text className="flex-1 ml-2.5 text-base leading-5 text-gray-900">
                    {selectedTask.description}
                  </Text>
                </View>
              ) : null}

              {/* ✅ 新增：进入子任务明细 Bottom Sheet 的按钮 */}
              <View className="mt-4">
                <Button
                  mode="contained"
                  onPress={openSubtaskDetail}
                  style={{ borderRadius: 16, backgroundColor: "#111827" }}
                  labelStyle={{ fontWeight: "bold" }}
                >
                  Open Subtask Detail (Mock)
                </Button>
              </View>
            </>
          ) : (
            <Text>No task selected</Text>
          )}
        </BottomSheetView>
      </BottomSheetModal>
      <SubtaskDetailBottomSheet
        ref={subtaskSheetRef}
        task={selectedTask}
        initialSubtasks={mockSubtasks}
      />
    </>
  );
};

export default TaskDetailBottomSheet;
