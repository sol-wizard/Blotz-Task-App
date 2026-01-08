import { fetchWeeklyTaskAvailability } from "@/shared/services/task-service";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";

export const useTaskDays = ({ selectedDay }: { selectedDay: Date }) => {
  const monday = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const mondayKey = format(monday, "yyyy-MM-dd");

  const { data: weeklyTaskAvailability = [], isLoading } = useQuery({
    queryKey: taskKeys.availability(mondayKey),
    queryFn: () => fetchWeeklyTaskAvailability(monday),
  });

  return {
    weeklyTaskAvailability,
    isLoading,
  };
};
