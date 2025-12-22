import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddTaskItemDTO } from "../models/add-task-item-dto";
import {
  addTaskItem,
  deleteTask,
  toggleTaskCompletion,
  updateTaskItem,
} from "../services/task-service";
import { EditTaskItemDTO } from "@/feature/task-add-edit/models/edit-task-item-dto";
import { taskKeys } from "../util/query-key-factory";
import { addDays, isSameDay, startOfDay } from "date-fns";
import { convertToDateTimeOffset } from "../util/convert-to-datetimeoffset";
import { TaskDetailDTO } from "../models/task-detail-dto";

const useTaskMutations = () => {
  const queryClient = useQueryClient();

  const addTaskMutation = useMutation({
    mutationFn: (task: AddTaskItemDTO) => addTaskItem(task),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      invalidateSelectedDayTask(queryClient, task.startTime, task.endTime);
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (taskId: number) => toggleTaskCompletion(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.floating() });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (task: TaskDetailDTO) => deleteTask(task.id),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.floating() });
      invalidateSelectedDayTask(queryClient, task.startTime, task.endTime);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (dto: EditTaskItemDTO) => updateTaskItem(dto),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.byId(task.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.floating() });
      invalidateSelectedDayTask(queryClient, task.startTime, task.endTime);
    },
  });
  return {
    addTask: addTaskMutation.mutateAsync,
    toggleTask: toggleTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutate,
    updateTask: updateTaskMutation.mutateAsync,
    isAdding: addTaskMutation.isPending,
    isToggling: toggleTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    deleteTaskSuccess: deleteTaskMutation.isSuccess,
    resetDeleteTask: deleteTaskMutation.reset,
  };
};

export default useTaskMutations;

function invalidateSelectedDayTask(
  queryClient: QueryClient,
  startTime?: string | null,
  endTime?: string | null,
) {
  if (!startTime || !endTime) return;

  const start = startOfDay(new Date(startTime));
  const end = startOfDay(new Date(endTime));
  if (isSameDay(start, end)) {
    queryClient.invalidateQueries({
      queryKey: taskKeys.selectedDay(convertToDateTimeOffset(start)),
    });
    return;
  } else {
    let cursorDay = startOfDay(start);
    while (start <= end) {
      queryClient.invalidateQueries({
        queryKey: taskKeys.selectedDay(convertToDateTimeOffset(cursorDay)),
      });
      cursorDay = addDays(cursorDay, 1);
    }
  }
}
