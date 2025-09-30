import TaskForm from "@/feature/task/forms/task-form";
import { EditTaskItemDTO } from "@/feature/task/models/edit-task-item-dto";
import { fetchTaskById } from "@/feature/task/services/task-service";
import { useSelectedTaskStore } from "@/feature/task/stores/selected-task-store";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";

const TaskEditScreen = () => {
  const { selectedTask, setSelectedTask } = useSelectedTaskStore();
  const { taskId } = useLocalSearchParams();

  // Fetch task if store is empty or id changed (handles refresh & direct links)
  useEffect(() => {
    if (!selectedTask || selectedTask.id !== Number(taskId)) {
      fetchTaskById(Number(taskId)).then((task) => {
        if (task) setSelectedTask(task);
      });
    }
  }, [taskId, selectedTask, setSelectedTask]);

  if (!selectedTask) {
    return <Text>Loading</Text>;
  }

  const taskEditData: EditTaskItemDTO = {
    ...selectedTask,
    startTime: selectedTask.startTime ? new Date(selectedTask.startTime) : undefined,
    endTime: selectedTask.endTime ? new Date(selectedTask.endTime) : undefined,
    labelId: selectedTask.label.labelId,
  };

  return (
    <TaskForm
      mode="edit"
      defaultValues={taskEditData}
      onSubmit={(task) => {
        console.log("onsubmit");
      }}
    />
  );
};

export default TaskEditScreen;
