import { fetchWeeklyTaskAvailability } from "@/shared/services/task-service";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";

export const weekAvailabilityQuery = (selectedDay: Date) => {
  const monday = startOfWeek(selectedDay, { weekStartsOn: 1 });
  return queryOptions({
    queryKey: taskKeys.weekAvailability(format(monday, "yyyy-MM-dd")),
    queryFn: () => fetchWeeklyTaskAvailability(monday),
  });
};

export const useTaskDays = ({ selectedDay }: { selectedDay: Date }) => {
  const { data: weeklyTaskAvailability = [], isLoading } = useQuery(
    weekAvailabilityQuery(selectedDay),
  );

  return {
    weeklyTaskAvailability,
    isLoading,
  };
};
