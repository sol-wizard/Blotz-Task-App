import { fetchMonthlyTaskAvailability } from "@/shared/services/task-service";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";

export const useMonthlyTasks = ({ selectedDay }: { selectedDay: Date }) => {
  const firstDate = startOfMonth(selectedDay);
  const monthKey = format(firstDate, "yyyy-MM");

  const { data: monthlyTaskAvailability = [], isLoading } = useQuery({
    queryKey: taskKeys.monthAvailability(monthKey),
    queryFn: () => fetchMonthlyTaskAvailability(firstDate),
  });

  return {
    monthlyTaskAvailability,
    isLoading,
  };
};
