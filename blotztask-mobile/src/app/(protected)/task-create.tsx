import TaskForm from "@/feature/task-add-edit/task-form";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";
import { mapFormToAddTaskItemDTO } from "@/feature/task-add-edit/util/form-to-task-dto-mapper";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native";
import { usePostHog } from "posthog-react-native";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { scheduleTaskReminder } from "@/shared/util/schedule-task-reminder";
import { NotificationTaskDTO } from "@/shared/models/notification-task-dto";

function TaskCreateScreen() {
  const router = useRouter();
  const { addTask, isAdding } = useTaskMutations();
  const posthog = usePostHog();

  const handleTaskSubmit = async (formValues: TaskFormField) => {
    try {
      const dto = mapFormToAddTaskItemDTO(formValues);
      const newTaskId = await addTask(dto);
      posthog.capture("manual_task_creation");

      const notificationTask: NotificationTaskDTO = {
        id: newTaskId,
        title: dto.title,
        startTime: dto.startTime?.toISOString(),
      };
      scheduleTaskReminder(notificationTask);

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
