import TaskForm from "@/feature/task-add-edit/task-form";
import { EditTaskItemDTO } from "@/feature/task-add-edit/models/edit-task-item-dto";
import { fetchTaskById } from "@/shared/services/task-service";
import { useSelectedTaskStore } from "@/shared/stores/selected-task-store";
import { mapFormToAddTaskItemDTO } from "@/feature/task-add-edit/util/form-to-task-dto-mapper";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";
import useTaskMutations from "@/shared/hooks/useTaskMutations";

// TODO: Fix flickering stale selected task in task detail page while navigating back
const TaskEditScreen = () => {
  const { updateTask, isUpdating } = useTaskMutations();
  const { selectedTask, setSelectedTask } = useSelectedTaskStore();
  const router = useRouter();

  // TODO: Add loading icon
  if (!selectedTask) {
    return <Text>Loading...</Text>;
  }

  // Show loading state while updating
  if (isUpdating) {
    return <Text>Updating task...</Text>;
  }

  const taskEditData: EditTaskItemDTO = {
    ...selectedTask,
    startTime: selectedTask.startTime ? new Date(selectedTask.startTime) : undefined,
    endTime: selectedTask.endTime ? new Date(selectedTask.endTime) : undefined,
    labelId: selectedTask.label ? selectedTask.label.labelId : undefined,
  };

  const handleTaskSubmit = async (formValues: TaskFormField) => {
    try {
      // Convert form to DTO
      const dto = mapFormToAddTaskItemDTO(formValues);

      await updateTask({
        ...dto,
        id: selectedTask.id,
      });

      // Fetch fresh data and update store before navigation
      const updatedTask = await fetchTaskById(selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }

      router.back();
      console.log("Task submitted successfully");
    } catch (error) {
      console.error("Failed to submit task:", error);
    }
  };

  return <TaskForm mode="edit" dto={taskEditData} onSubmit={handleTaskSubmit} />;
};

export default TaskEditScreen;
