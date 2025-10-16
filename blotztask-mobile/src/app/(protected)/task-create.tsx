import TaskForm from "@/feature/task-add-edit/task-form";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";
import { mapFormToAddTaskItemDTO } from "@/feature/task-add-edit/util/form-to-task-dto-mapper";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { usePostHog } from "posthog-react-native";
import useTaskMutations from "@/shared/hooks/useTaskMutations";

const TaskCreateScreen = () => {
  const router = useRouter();
  const { addTask, isAdding } = useTaskMutations();
  const posthog = usePostHog();

  const handleTaskSubmit = async (formValues: TaskFormField) => {
    try {
      const dto = mapFormToAddTaskItemDTO(formValues);
      await addTask(dto);
      posthog.capture("manual_task_creation");
      router.back();
      console.log("Task created successfully");
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  if (isAdding) {
    return <Text>Creating task...</Text>;
  }

  return <TaskForm mode="create" onSubmit={handleTaskSubmit} />;
};

export default TaskCreateScreen;
