import { isSameDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchTasksForDate } from "../services/task-service";

const useSelectedDayTasks = ({ selectedDay }: { selectedDay: Date }) => {
  // Only show floating tasks if the selectedDay is today
  const showFloatingTasks = isSameDay(selectedDay, new Date());

  const { data: selectedDayTasks = [], isLoading } = useQuery({
    queryKey: ["tasks", selectedDay.toISOString()],
    queryFn: () => fetchTasksForDate(selectedDay, showFloatingTasks),
  });

  return {
    selectedDayTasks,
    isLoading,
  };
};

export default useSelectedDayTasks;
