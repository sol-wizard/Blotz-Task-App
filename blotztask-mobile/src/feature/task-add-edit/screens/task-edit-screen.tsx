import TaskForm from "@/feature/task-add-edit/task-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/loading-screen";
import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { ReturnButton } from "@/shared/components/return-button";

export default function TaskEditScreen() {
  const { updateTaskAsync, isUpdating } = useTaskMutations();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = Number(params.taskId ?? "");
  const { selectedTask, isLoading, isFetching } = useTaskById({ taskId });

  const router = useRouter();

  if (isLoading || !selectedTask || isUpdating || isFetching) {
    return <LoadingScreen />;
  }

  const taskEditData: TaskUpsertDTO = {
    title: selectedTask.title,
    description: selectedTask.description,
    startTime: selectedTask.startTime,
    endTime: selectedTask.endTime,
    labelId: selectedTask.label ? selectedTask.label.labelId : undefined,
    timeType: selectedTask.timeType,
    notificationId: selectedTask.notificationId,
    alertTime: selectedTask.alertTime,
    isDeadline: selectedTask.isDeadline,
  };

  const handleTaskSubmit = async (formValues: TaskUpsertDTO) => {
    try {
      await updateTaskAsync({
        taskId: selectedTask.id,
        dto: formValues,
      });

      router.back();
    } catch (error) {
      console.error("Failed to submit task:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View
        style={{
          paddingTop: 8,
          paddingHorizontal: 20,
        }}
      >
        <ReturnButton />
      </View>

      <View style={{ flex: 1 }}>
        <TaskForm mode="edit" dto={taskEditData} onSubmit={handleTaskSubmit} />
      </View>
    </SafeAreaView>
  );
}
