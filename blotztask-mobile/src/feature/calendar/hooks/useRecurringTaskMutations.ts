import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { saveRecurringOccurrence } from "@/shared/services/task-service";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";

export function useRecurringTaskMutations() {
  const queryClient = useQueryClient();

  const { mutate: completeOccurrence, isPending } = useMutation({
    mutationFn: saveRecurringOccurrence,
    onSuccess: (_data, variables) => {
      const dayKey = convertToDateTimeOffset(startOfDay(new Date(variables.occurrenceDate)));
      queryClient.invalidateQueries({ queryKey: taskKeys.selectedDay(dayKey) });
    },
  });

  return { completeOccurrence, isPending };
}
