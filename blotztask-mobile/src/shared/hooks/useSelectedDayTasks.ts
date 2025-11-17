import { useQuery } from "@tanstack/react-query";
import { fetchTasksForDate } from "../services/task-service";

const useSelectedDayTasks = ({ selectedDay }: { selectedDay: Date }) => {
  const { data: selectedDayTasks = [], isLoading } = useQuery({
    queryKey: ["tasks", selectedDay.toISOString()],
    queryFn: () => fetchTasksForDate(selectedDay, true),
  });

  return {
    selectedDayTasks,
    isLoading,
  };
};

export default useSelectedDayTasks;
