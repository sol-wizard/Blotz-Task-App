import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddTaskItemDTO } from "../models/add-task-item-dto";
import {
  addTaskItem,
  deleteTask,
  toggleTaskCompletion,
  updateTaskItem,
} from "../services/task-service";
import { EditTaskItemDTO } from "@/feature/task-add-edit/models/edit-task-item-dto";
import { taskKeys } from "../constants/query-key-factory";
import { addDays, isSameDay, startOfDay } from "date-fns";
import { convertToDateTimeOffset } from "../util/convert-to-datetimeoffset";
import { TaskDetailDTO } from "../models/task-detail-dto";

type UpdateTaskArgs = {
  taskId: number;
  dto: EditTaskItemDTO;
};

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
    mutationFn: ({ taskId, selectedDay }: { taskId: number; selectedDay?: Date }) =>
      toggleTaskCompletion(taskId),
    onMutate: async (data) => {
      if (!data?.selectedDay) return;
      const prevSelectedDayData = queryClient.getQueryData<any>(
        taskKeys.selectedDay(convertToDateTimeOffset(startOfDay(data.selectedDay))),
      );
      const toggleInList = (list: any[] | undefined) =>
        list?.map((t) => (t.id === data.taskId ? { ...t, isCompleted: !t.isCompleted } : t));
      queryClient.setQueryData(taskKeys.all, toggleInList(prevSelectedDayData));
      return { prevSelectedDayData };
    },
    onError: (_err, _taskId, context) => {
      if (!context) return;
      queryClient.setQueryData(taskKeys.all, context.prevSelectedDayData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (task: TaskDetailDTO) => deleteTask(task.id),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      invalidateSelectedDayTask(queryClient, task.startTime, task.endTime);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, dto }: UpdateTaskArgs) => updateTaskItem(taskId, dto),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.byId(task.taskId) });
      invalidateSelectedDayTask(queryClient, task.dto.startTime, task.dto.endTime);
    },
  });
  return {
    addTask: addTaskMutation.mutate,
    toggleTask: toggleTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
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
  if (!startTime || !endTime) {
    queryClient.invalidateQueries({
      queryKey: taskKeys.selectedDay(convertToDateTimeOffset(new Date())),
    });
    return;
  }

  const start = startOfDay(new Date(startTime));
  const end = startOfDay(new Date(endTime));

  if (isSameDay(start, end)) {
    queryClient.invalidateQueries({
      queryKey: taskKeys.selectedDay(convertToDateTimeOffset(start)),
    });
    return;
  } else {
    let cursorDay = startOfDay(start);
    while (cursorDay <= end) {
      queryClient.invalidateQueries({
        queryKey: taskKeys.selectedDay(convertToDateTimeOffset(cursorDay)),
      });
      cursorDay = addDays(cursorDay, 1);
    }
  }
}
