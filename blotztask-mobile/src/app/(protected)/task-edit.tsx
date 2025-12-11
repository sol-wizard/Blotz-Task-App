import TaskForm from "@/feature/task-add-edit/task-form";
import { EditTaskItemDTO } from "@/feature/task-add-edit/models/edit-task-item-dto";
import { mapFormToAddTaskItemDTO } from "@/feature/task-add-edit/util/form-to-task-dto-mapper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { SubmitTaskDTO } from "@/feature/task-add-edit/models/submit-task-dto";

// TODO: Fix flickering stale selected task in task detail page while navigating back
const TaskEditScreen = () => {
  const { updateTask, isUpdating } = useTaskMutations();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = Number(params.taskId ?? "");
  const { selectedTask, isLoading, isFetching } = useTaskById({ taskId });

  const router = useRouter();

  // TODO: Add loading icon
  if (isLoading || !selectedTask || isUpdating || isFetching) {
    return <LoadingScreen />;
  }

  const taskEditData: EditTaskItemDTO = {
    id: selectedTask.id,
    title: selectedTask.title,
    description: selectedTask.description,
    startTime: selectedTask.startTime ? new Date(selectedTask.startTime) : undefined,
    endTime: selectedTask.endTime ? new Date(selectedTask.endTime) : undefined,
    labelId: selectedTask.label ? selectedTask.label.labelId : undefined,
    timeType: selectedTask.timeType,
    notificationId: selectedTask.notificationId,
  };

  const handleTaskSubmit = async (formValues: SubmitTaskDTO) => {
    try {
      // Convert form to DTO
      const dto = mapFormToAddTaskItemDTO(formValues);
      console.log("Submitting task with data:", dto);

      await updateTask({
        ...dto,
        id: selectedTask.id,
      });

      router.back();
      console.log("Task submitted successfully");
    } catch (error) {
      console.error("Failed to submit task:", error);
    }
  };

  return <TaskForm mode="edit" dto={taskEditData} onSubmit={handleTaskSubmit} />;
};

export default TaskEditScreen;
