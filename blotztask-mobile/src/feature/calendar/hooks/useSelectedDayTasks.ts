import { isSameDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchOverdueTasks, fetchTasksForDate } from "../../../shared/services/task-service";

const useSelectedDayTasks = ({ selectedDay }: { selectedDay: Date }) => {
  // Only show floating tasks if the selectedDay is today
  const showFloatingTasks = isSameDay(selectedDay, new Date());

  const { data: tasksForSelectedDay = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["tasks", selectedDay.toISOString()],
    queryFn: () => fetchTasksForDate(selectedDay, showFloatingTasks),
  });

  const { data: overdueTasks = [], isLoading: isLoadingOverdue } = useQuery({
    queryKey: ["overdueTasks"],
    queryFn: fetchOverdueTasks,
  });

  const selectedDayTasks = [
    ...new Map([...overdueTasks, ...tasksForSelectedDay].map((task) => [task.id, task])).values(),
  ];

  const isLoading = isLoadingTasks || isLoadingOverdue;

  return {
    selectedDayTasks,
    isLoading,
  };
};

export default useSelectedDayTasks;
