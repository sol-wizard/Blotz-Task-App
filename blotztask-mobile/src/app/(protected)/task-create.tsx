import TaskForm from "@/feature/task-add-edit/task-form";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native";
import { usePostHog } from "posthog-react-native";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";

function TaskCreateScreen() {
  const router = useRouter();
  const { addTask, isAdding } = useTaskMutations();
  const posthog = usePostHog();

  const handleTaskSubmit = async (submitTask: AddTaskItemDTO) => {
    try {
      await addTask(submitTask);
      posthog.capture("manual_task_creation");

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
    <SafeAreaView className="flex-1 bg-white">
      <TaskForm mode="create" onSubmit={handleTaskSubmit} />
    </SafeAreaView>
  );
}

export default TaskCreateScreen;
