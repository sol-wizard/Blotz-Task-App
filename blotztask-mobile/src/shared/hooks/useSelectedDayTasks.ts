import { useQuery } from "@tanstack/react-query";
import { fetchTasksForDate } from "../services/task-service";
import { format } from "date-fns";

const useSelectedDayTasks = ({ selectedDay }: { selectedDay: Date }) => {
  const dateKey = format(selectedDay, "yyyy-MM-dd");

  const { data: selectedDayTasks = [], isLoading } = useQuery({
    queryKey: ["tasks", dateKey],
    queryFn: () => fetchTasksForDate(selectedDay, true),
  });

  return {
    selectedDayTasks,
    isLoading,
  };
};

export default useSelectedDayTasks;
