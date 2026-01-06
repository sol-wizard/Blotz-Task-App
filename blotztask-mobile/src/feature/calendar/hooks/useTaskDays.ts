import { useQueries } from "@tanstack/react-query";
import { addDays, format, startOfWeek, isToday, startOfDay } from "date-fns";
import { fetchTasksForDate } from "@/shared/services/task-service";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { DailyTaskIndicatorDTO } from "../models/daily-task-indicator-dto";

/**
 * Hook that returns weekly task availability for calendar dots.
 * Fetches tasks for all 7 days of the week and derives availability
 * from the actual task data, reusing the existing GetTasksByDate endpoint.
 */
export const useTaskDays = ({ selectedDay }: { selectedDay: Date }) => {
  const monday = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const queries = useQueries({
    queries: weekDays.map((day) => ({
      queryKey: taskKeys.selectedDay(convertToDateTimeOffset(startOfDay(day))),
      queryFn: () => fetchTasksForDate(day, isToday(day)),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  const weeklyTaskAvability: DailyTaskIndicatorDTO[] = weekDays.map((day, index) => ({
    date: format(day, "yyyy-MM-dd"),
    hasTask: (queries[index].data?.length ?? 0) > 0,
  }));

  return {
    weeklyTaskAvability,
    isLoading,
  };
};
