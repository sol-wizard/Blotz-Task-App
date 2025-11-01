import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddTaskItemDTO } from "../models/add-task-item-dto";
import {
  addTaskItem,
  deleteTask,
  toggleTaskCompletion,
  updateTaskItem,
} from "../services/task-service";
import { EditTaskItemDTO } from "@/feature/task-add-edit/models/edit-task-item-dto";

const useTaskMutations = () => {
  const queryClient = useQueryClient();

  const addTaskMutation = useMutation({
    mutationFn: (task: AddTaskItemDTO) => addTaskItem(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (taskId: number) => toggleTaskCompletion(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (dto: EditTaskItemDTO) => updateTaskItem(dto),
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["taskId", dto.id] });
    },
  });
  return {
    addTask: addTaskMutation.mutateAsync,
    toggleTask: toggleTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    isAdding: addTaskMutation.isPending,
    isToggling: toggleTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    deleteTaskError: deleteTaskMutation.error,
    deleteTaskSuccess: deleteTaskMutation.isSuccess,
    resetDeleteTask: deleteTaskMutation.reset,
  };
};

export default useTaskMutations;
