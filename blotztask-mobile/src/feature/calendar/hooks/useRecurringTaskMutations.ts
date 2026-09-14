import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { taskKeys } from "@/shared/constants/query-key-factory";
import {
  materializeRecurringOccurrence,
  saveRecurringOccurrence,
} from "@/shared/services/task-service";
import { useFirework } from "@/feature/firework-animation/hooks/useFirework";
import { analytics } from "@/shared/services/analytics";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

type CompleteRecurringOccurrenceArgs = {
  recurringTaskId: number;
  occurrenceDate: string;
  wasDone: boolean;
  wasOverdue: boolean;
  hasDeadline: boolean;
};

type MaterializeRecurringOccurrenceArgs = {
  recurringTaskId: number;
  occurrenceDate: string;
  invalidateOnSuccess?: boolean;
};

export function useRecurringTaskMutations() {
  const queryClient = useQueryClient();
  const { task: taskFirework } = useFirework();

  const { mutate: completeOccurrence, isPending: isCompletingOccurrence } = useMutation({
    mutationFn: ({ recurringTaskId, occurrenceDate }: CompleteRecurringOccurrenceArgs) =>
      saveRecurringOccurrence({ recurringTaskId, occurrenceDate }),
    onMutate: (data) => {
      const dayKey = format(parseISO(data.occurrenceDate), "yyyy-MM-dd");
      const prevSelectedDayData = queryClient.getQueryData<TaskDetailDTO[]>(
        taskKeys.selectedDay(dayKey),
      );
      const toggleInList = (list: TaskDetailDTO[] | undefined) =>
        list?.map((t) =>
          t.recurringOccurrence?.recurringTaskId === data.recurringTaskId &&
          t.recurringOccurrence?.occurrenceDate === data.occurrenceDate
            ? { ...t, isDone: !t.isDone }
            : t,
        );
      queryClient.setQueryData(taskKeys.selectedDay(dayKey), toggleInList(prevSelectedDayData));
      return { dayKey, prevSelectedDayData };
    },
    onError: (_err, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(taskKeys.selectedDay(context.dayKey), context.prevSelectedDayData);
    },
    onSuccess: (_data, variables) => {
      taskFirework.playIfCompleting(variables.wasDone);
      if (!variables.wasDone) {
        analytics.trackTaskCompleted({
          taskId: variables.recurringTaskId,
          isRecurring: true,
          wasOverdue: variables.wasOverdue,
          hasDeadline: variables.hasDeadline,
          occurrenceDate: variables.occurrenceDate,
        });
      }
      invalidateRecurringOccurrenceQueries(queryClient, variables.occurrenceDate);
    },
  });

  const { mutateAsync: materializeOccurrenceAsync, isPending: isMaterializingOccurrence } =
    useMutation({
      mutationFn: ({ recurringTaskId, occurrenceDate }: MaterializeRecurringOccurrenceArgs) =>
        materializeRecurringOccurrence({ recurringTaskId, occurrenceDate }),
      onSuccess: (_data, variables) => {
        if (variables.invalidateOnSuccess === false) return;

        invalidateRecurringOccurrenceQueries(queryClient, variables.occurrenceDate);
      },
    });

  return {
    completeOccurrence,
    materializeOccurrenceAsync,
    isPending: isCompletingOccurrence || isMaterializingOccurrence,
  };
}

function invalidateRecurringOccurrenceQueries(queryClient: QueryClient, occurrenceDate: string) {
  const date = parseISO(occurrenceDate);
  const dayKey = format(date, "yyyy-MM-dd");
  const mondayKey = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthKey = format(startOfMonth(date), "yyyy-MM");

  queryClient.invalidateQueries({ queryKey: taskKeys.selectedDay(dayKey) });
  queryClient.invalidateQueries({ queryKey: taskKeys.weekAvailability(mondayKey) });
  queryClient.invalidateQueries({ queryKey: taskKeys.monthAvailability(monthKey) });
}
