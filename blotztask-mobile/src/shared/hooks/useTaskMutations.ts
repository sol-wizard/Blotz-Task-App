import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskUpsertDTO } from "../models/task-upsert-dto";
import { RecurringTaskCreateDTO } from "../models/recurring-task-create-dto";
import {
  addTaskItem,
  createRecurringTask,
  deleteRecurringOccurrence,
  deleteTask,
  toggleTaskCompletion,
  updateRecurringOccurrence,
  updateRecurringTaskFuture,
  updateTaskItem,
} from "../services/task-service";
import { ddlKeys, taskKeys } from "../constants/query-key-factory";
import { addDays, format, isSameDay, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";
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

type UpdateRecurringTaskFutureArgs = {
  recurringTaskId: number;
  effectiveDate: string;
  dto: TaskUpsertDTO;
  stopRepeating: boolean;
  frequency?: RecurringTaskCreateDTO["frequency"];
  interval?: number;
  daysOfWeek?: number | null;
  dayOfMonth?: number | null;
  endDate?: string | null;
  endDateChanged: boolean;
  scheduleTimeZoneId?: string | null;
  deadlineTimeZoneId?: string | null;
};

type DeleteRecurringOccurrenceArgs = {
  recurringTaskId: number;
  occurrenceDate: string;
  deleteFuture: boolean;
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
      queryClient.invalidateQueries({ queryKey: ddlKeys.all });
      invalidateSelectedDayTask(queryClient, task.templateStartTime, task.templateEndTime ?? task.templateStartTime);
      invalidateTaskAvailability(queryClient, task.templateStartTime, task.templateEndTime ?? task.templateStartTime);
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

  const deleteRecurringOccurrenceMutation = useMutation({
    mutationFn: (payload: DeleteRecurringOccurrenceArgs) => deleteRecurringOccurrence(payload),
    onSuccess: async (_data, task) => {
      queryClient.removeQueries({ queryKey: ["virtualTaskDetail"] });
      if (!task.deleteFuture) {
        removeDeletedRecurringOccurrencesFromSelectedDayCaches(queryClient, task);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["ddl"] }),
        queryClient.invalidateQueries({ queryKey: [...taskKeys.all, "weekAvailability"] }),
        queryClient.invalidateQueries({ queryKey: [...taskKeys.all, "monthAvailability"] }),
        invalidateSelectedDayByDateOnly(queryClient, task.occurrenceDate),
        invalidateTaskAvailability(queryClient, task.occurrenceDate),
      ]);
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
      invalidateTaskAvailability(queryClient, task.dto.startTime, task.dto.endTime);
    },
  });

  const updateRecurringTaskFutureMutation = useMutation({
    mutationFn: ({
      recurringTaskId,
      effectiveDate,
      dto,
      stopRepeating,
      frequency,
      interval,
      daysOfWeek,
      dayOfMonth,
      endDate,
      endDateChanged,
      scheduleTimeZoneId,
      deadlineTimeZoneId,
    }: UpdateRecurringTaskFutureArgs) =>
      updateRecurringTaskFuture({
        recurringTaskId,
        effectiveDate,
        taskDetails: dto,
        stopRepeating,
        frequency,
        interval,
        daysOfWeek,
        dayOfMonth,
        endDate,
        endDateChanged,
        scheduleTimeZoneId,
        deadlineTimeZoneId,
      }),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: ["ddl"] });
      invalidateSelectedDayTask(queryClient, task.dto.startTime, task.dto.endTime);
      invalidateTaskAvailability(queryClient, task.dto.startTime, task.dto.endTime);
    },
  });
  return {
    addTask: addTaskMutation.mutate,
    addTaskAsync: addTaskMutation.mutateAsync,
    createRecurringTask: createRecurringTaskMutation.mutate,
    createRecurringTaskAsync: createRecurringTaskMutation.mutateAsync,
    toggleTask: toggleTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    deleteRecurringOccurrence: deleteRecurringOccurrenceMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    updateTaskAsync: updateTaskMutation.mutateAsync,
    updateRecurringOccurrence: updateRecurringOccurrenceMutation.mutate,
    updateRecurringOccurrenceAsync: updateRecurringOccurrenceMutation.mutateAsync,
    updateRecurringTaskFuture: updateRecurringTaskFutureMutation.mutate,
    updateRecurringTaskFutureAsync: updateRecurringTaskFutureMutation.mutateAsync,
    isAdding: addTaskMutation.isPending,
    isCreatingRecurringTask: createRecurringTaskMutation.isPending,
    isToggling: toggleTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    isDeletingRecurringOccurrence: deleteRecurringOccurrenceMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isUpdatingRecurringOccurrence: updateRecurringOccurrenceMutation.isPending,
    isUpdatingRecurringTaskFuture: updateRecurringTaskFutureMutation.isPending,
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

function invalidateTaskAvailability(queryClient: QueryClient, startTime: string, endTime = startTime) {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const mondayKeys = new Set([
    format(startOfWeek(start, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    format(startOfWeek(end, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  ]);
  const monthKeys = new Set([
    format(startOfMonth(start), "yyyy-MM"),
    format(startOfMonth(end), "yyyy-MM"),
  ]);

  return Promise.all([
    ...Array.from(mondayKeys).map((key) =>
      queryClient.invalidateQueries({ queryKey: taskKeys.weekAvailability(key) }),
    ),
    ...Array.from(monthKeys).map((key) =>
      queryClient.invalidateQueries({ queryKey: taskKeys.monthAvailability(key) }),
    ),
  ]);
}

function invalidateSelectedDayByDateOnly(queryClient: QueryClient, dateOnly: string) {
  return queryClient.invalidateQueries({
    queryKey: taskKeys.selectedDay(convertToDateTimeOffset(startOfDay(parseISO(dateOnly)))),
  });
}

function removeDeletedRecurringOccurrencesFromSelectedDayCaches(
  queryClient: QueryClient,
  deletedOccurrence: DeleteRecurringOccurrenceArgs,
) {
  const cachedSelectedDayQueries = queryClient.getQueriesData<TaskDetailDTO[]>({
    queryKey: [...taskKeys.all, "selectedDay"],
  });

  cachedSelectedDayQueries.forEach(([queryKey, cachedTasks]) => {
    if (!cachedTasks) return;

    const remainingTasks = cachedTasks.filter(
      (task) => !matchesDeletedRecurringOccurrence(task, deletedOccurrence),
    );

    if (remainingTasks.length === cachedTasks.length) return;

    queryClient.setQueryData(queryKey, remainingTasks);
  });
}

function matchesDeletedRecurringOccurrence(
  task: TaskDetailDTO,
  deletedOccurrence: DeleteRecurringOccurrenceArgs,
): boolean {
  const recurringOccurrence = task.recurringOccurrence;
  if (!recurringOccurrence) return false;
  if (recurringOccurrence.recurringTaskId !== deletedOccurrence.recurringTaskId) return false;

  if (deletedOccurrence.deleteFuture) {
    return recurringOccurrence.occurrenceDate >= deletedOccurrence.occurrenceDate;
  }

  return recurringOccurrence.occurrenceDate === deletedOccurrence.occurrenceDate;
}
