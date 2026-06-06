import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskUpsertDTO } from "../models/task-upsert-dto";
import { RecurringTaskCreateDTO } from "../models/recurring-task-create-dto";
import {
  addTaskItem,
  createRecurringTask,
  deleteTask,
  toggleTaskCompletion,
  updateRecurringOccurrence,
  updateTaskItem,
} from "../services/task-service";
import { taskKeys } from "../constants/query-key-factory";
import { addDays, format, isSameDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { convertToDateTimeOffset } from "../util/convert-to-datetimeoffset";
import { TaskDetailDTO } from "../models/task-detail-dto";

type UpdateTaskArgs = {
  taskId: number;
  dto: TaskUpsertDTO;
};

type UpdateRecurringOccurrenceArgs = {
  recurringTaskId: number;
  occurrenceDate: string;
  dto: TaskUpsertDTO;
};

const useTaskMutations = () => {
  const queryClient = useQueryClient();

  const addTaskMutation = useMutation({
    mutationFn: (task: TaskUpsertDTO) => addTaskItem(task),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: ["ddl"] });
      invalidateSelectedDayTask(queryClient, task.startTime, task.endTime);
    },
  });

  const createRecurringTaskMutation = useMutation({
    mutationFn: (task: RecurringTaskCreateDTO) => createRecurringTask(task),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      invalidateSelectedDayTask(queryClient, task.templateStartTime, task.templateEndTime ?? task.templateStartTime);
      invalidateTaskAvailability(queryClient, task.templateStartTime);
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ taskId, selectedDay }: { taskId: number; selectedDay?: Date }) =>
      toggleTaskCompletion(taskId),
    onMutate: async (data) => {
      if (!data?.selectedDay) return;
      const prevSelectedDayData = queryClient.getQueryData<TaskDetailDTO[]>(
        taskKeys.selectedDay(convertToDateTimeOffset(startOfDay(data.selectedDay))),
      );
      const toggleInList = (list: TaskDetailDTO[] | undefined) =>
        list?.map((t) => (t.id === data.taskId ? { ...t, isDone: !t.isDone } : t));
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
    mutationFn: (task: TaskDetailDTO) => deleteTask(task.id!),
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
      queryClient.invalidateQueries({ queryKey: ["ddl"] });
      invalidateSelectedDayTask(queryClient, task.dto.startTime, task.dto.endTime);
    },
  });

  const updateRecurringOccurrenceMutation = useMutation({
    mutationFn: ({ recurringTaskId, occurrenceDate, dto }: UpdateRecurringOccurrenceArgs) =>
      updateRecurringOccurrence({
        recurringTaskId,
        occurrenceDate,
        taskDetails: dto,
      }),
    onSuccess: (data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.byId(data.taskItemId) });
      queryClient.invalidateQueries({ queryKey: ["ddl"] });
      invalidateSelectedDayTask(queryClient, task.dto.startTime, task.dto.endTime);
      invalidateTaskAvailability(queryClient, task.occurrenceDate);
    },
  });
  return {
    addTask: addTaskMutation.mutate,
    addTaskAsync: addTaskMutation.mutateAsync,
    createRecurringTask: createRecurringTaskMutation.mutate,
    createRecurringTaskAsync: createRecurringTaskMutation.mutateAsync,
    toggleTask: toggleTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    updateTaskAsync: updateTaskMutation.mutateAsync,
    updateRecurringOccurrence: updateRecurringOccurrenceMutation.mutate,
    updateRecurringOccurrenceAsync: updateRecurringOccurrenceMutation.mutateAsync,
    isAdding: addTaskMutation.isPending,
    isCreatingRecurringTask: createRecurringTaskMutation.isPending,
    isToggling: toggleTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isUpdatingRecurringOccurrence: updateRecurringOccurrenceMutation.isPending,
    deleteTaskSuccess: deleteTaskMutation.isSuccess,
    resetDeleteTask: deleteTaskMutation.reset,
  };
};

export default useTaskMutations;

export function invalidateSelectedDayTask(
  queryClient: QueryClient,
  startTime: string,
  endTime: string,
) {
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

function invalidateTaskAvailability(queryClient: QueryClient, dateTime: string) {
  const date = new Date(dateTime);
  const mondayKey = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthKey = format(startOfMonth(date), "yyyy-MM");

  queryClient.invalidateQueries({ queryKey: taskKeys.weekAvailability(mondayKey) });
  queryClient.invalidateQueries({ queryKey: taskKeys.monthAvailability(monthKey) });
}
