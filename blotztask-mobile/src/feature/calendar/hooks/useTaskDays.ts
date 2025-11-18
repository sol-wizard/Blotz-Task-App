import { fetchWeeklyTaskAvailability } from "@/shared/services/task-service";
import { useQuery } from "@tanstack/react-query";
import { startOfWeek } from "date-fns";

export const useTaskDays = ({ selectedDay }: { selectedDay: Date }) => {
  const monday = startOfWeek(selectedDay, { weekStartsOn: 1 });

  const { data: weeklyTaskAvability = [], isLoading } = useQuery({
    queryKey: ["taskDays", monday.toISOString()],
    queryFn: () => fetchWeeklyTaskAvailability(monday),
  });

  return {
    weeklyTaskAvability,
    isLoading,
  };
};
