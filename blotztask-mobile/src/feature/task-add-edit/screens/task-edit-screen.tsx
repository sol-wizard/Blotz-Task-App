import TaskForm from "@/feature/task-add-edit/task-form";
import { EditTaskItemDTO } from "@/feature/task-add-edit/models/edit-task-item-dto";
import { useLocalSearchParams, useRouter } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";

export default function TaskEditScreen() {
  const { updateTask, isUpdating } = useTaskMutations();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = Number(params.taskId ?? "");
  const { selectedTask, isLoading, isFetching } = useTaskById({ taskId });

  const router = useRouter();

  if (isLoading || !selectedTask || isUpdating || isFetching) {
    return <LoadingScreen />;
  }

  const taskEditData: EditTaskItemDTO = {
    title: selectedTask.title,
    description: selectedTask.description,
    startTime: selectedTask.startTime,
    endTime: selectedTask.endTime,
    labelId: selectedTask.label ? selectedTask.label.labelId : undefined,
    timeType: selectedTask.timeType,
    notificationId: selectedTask.notificationId,
    alertTime: selectedTask.alertTime,
  };

  const handleTaskSubmit = async (formValues: AddTaskItemDTO) => {
    try {
      await updateTask({
        taskId: selectedTask.id,
        dto: formValues,
      });

      router.back();
    } catch (error) {
      console.error("Failed to submit task:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View pointerEvents="box-none" className="ml-6 pt-2">
        <ReturnButton />
      </View>
      <TaskForm mode="edit" dto={taskEditData} onSubmit={handleTaskSubmit} />
    </SafeAreaView>
  );
}
