import TaskForm from "@/feature/task-add-edit/task-form";
import { useRouter } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { SafeAreaView } from "react-native-safe-area-context";
import { analytics } from "@/shared/services/analytics";

export default function TaskCreateScreen() {
  const router = useRouter();
  const { addTask, isAdding } = useTaskMutations();

  const handleTaskSubmit = async (submitTask: AddTaskItemDTO) => {
    try {
      await addTask(submitTask);

      analytics.trackManualTaskCreated();

      router.back();
      console.log("Task created successfully");
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  if (isAdding) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <TaskForm mode="create" onSubmit={handleTaskSubmit} />
    </SafeAreaView>
  );
}
