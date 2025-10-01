import { useState, useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { Button, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { router } from "expo-router";
import { TaskDetailTag } from "./task-detail-tag";
import { format, isBefore, startOfDay } from "date-fns";

type TaskDetailBottomSheetProps = {
  task?: TaskDetailDTO;
  handleEditPress: () => void;
  onOpenSubtasks: (task: TaskDetailDTO) => void;
};

const TaskDetailBottomSheet = ({
  task,
  handleEditPress,
  onOpenSubtasks,
}: TaskDetailBottomSheetProps) => {
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(task);

  useEffect(() => {
    setSelectedTask(task);
  }, [task]);

  const handleAiBreakdown = () => {
    if (!task) return;

    router.push({
      pathname: "/(protected)/ai-breakdown",
      params: {
        id: task.id,
      },
    });
  };

  return (
    <>
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
              <TaskDetailTag>{selectedTask.label?.name || "No Label"}</TaskDetailTag>
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

            <View className="mt-4">
              <Button
                mode="contained"
                onPress={() => (selectedTask ? onOpenSubtasks(selectedTask) : undefined)}
                disabled={!selectedTask?.id}
                style={{ borderRadius: 16, backgroundColor: "#111827" }}
                labelStyle={{ fontWeight: "bold" }}
              >
                Open Subtasks
              </Button>
            </View>
          </>
        ) : (
          <Text>No task selected</Text>
        )}
      </BottomSheetView>
    </>
  );
};

export default TaskDetailBottomSheet;
