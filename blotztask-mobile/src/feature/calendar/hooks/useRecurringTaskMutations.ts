import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { taskKeys } from "@/shared/constants/query-key-factory";
import {
  materializeRecurringOccurrence,
  saveRecurringOccurrence,
} from "@/shared/services/task-service";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { useFirework } from "@/feature/firework-animation/hooks/useFirework";

type CompleteRecurringOccurrenceArgs = {
  recurringTaskId: number;
  occurrenceDate: string;
  wasDone: boolean;
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
    onSuccess: (_data, variables) => {
      taskFirework.playIfCompleting(variables.wasDone);
      invalidateRecurringOccurrenceQueries(queryClient, variables.occurrenceDate);
    },
  });

  const {
    mutateAsync: materializeOccurrenceAsync,
    isPending: isMaterializingOccurrence,
  } = useMutation({
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

function invalidateRecurringOccurrenceQueries(
  queryClient: QueryClient,
  occurrenceDate: string,
) {
  const date = parseISO(occurrenceDate);
  const dayKey = convertToDateTimeOffset(startOfDay(date));
  const mondayKey = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthKey = format(startOfMonth(date), "yyyy-MM");

  queryClient.invalidateQueries({ queryKey: taskKeys.selectedDay(dayKey) });
  queryClient.invalidateQueries({ queryKey: taskKeys.weekAvailability(mondayKey) });
  queryClient.invalidateQueries({ queryKey: taskKeys.monthAvailability(monthKey) });
}
