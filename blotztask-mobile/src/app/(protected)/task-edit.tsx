import TaskForm from "@/feature/task-add-edit/task-form";
import { EditTaskItemDTO } from "@/feature/task-add-edit/models/edit-task-item-dto";
import { fetchTaskById, updateTaskItem } from "@/feature/task/services/task-service";
import { useSelectedTaskStore } from "@/feature/task/stores/selected-task-store";
import { mapFormToAddTaskItemDTO } from "@/feature/task-add-edit/util/task-dto-mapper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";

const TaskEditScreen = () => {
  const { selectedTask, setSelectedTask } = useSelectedTaskStore();
  const { taskId } = useLocalSearchParams();
  const router = useRouter();

  // Fetch task if store is empty or id changed (handles refresh & direct links)
  useEffect(() => {
    if (!selectedTask || selectedTask.id !== Number(taskId)) {
      fetchTaskById(Number(taskId)).then((task) => {
        if (task) setSelectedTask(task);
      });
    }
  }, [taskId, selectedTask, setSelectedTask]);

  // TODO: Add loading icon
  if (!selectedTask) {
    return <Text>Loading...</Text>;
  }

  const taskEditData: EditTaskItemDTO = {
    ...selectedTask,
    startTime: selectedTask.startTime ? new Date(selectedTask.startTime) : undefined,
    endTime: selectedTask.endTime ? new Date(selectedTask.endTime) : undefined,
    labelId: selectedTask.label.labelId,
  };

  const handleTaskSubmit = async (formValues: TaskFormField) => {
    try {
      // Convert form to DTO
      const dto = mapFormToAddTaskItemDTO(formValues);

      await updateTaskItem({
        ...dto,
        id: selectedTask.id,
      });

      const updatedTask = await fetchTaskById(selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
        router.back();
      }

      console.log("Task submitted successfully");
    } catch (error) {
      console.error("Failed to submit task:", error);
    }
  };

  return (
    <TaskForm
      mode="edit"
      defaultValues={taskEditData}
      onSubmit={(task) => {
        handleTaskSubmit(task);
      }}
    />
  );
};

export default TaskEditScreen;
