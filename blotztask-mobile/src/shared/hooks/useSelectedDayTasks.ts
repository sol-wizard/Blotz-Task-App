import { isSameDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchOverdueTasks, fetchTasksForDate } from "../services/task-service";
import { useState } from "react";

const useSelectedDayTasks = (initialDate: Date = new Date()) => {
  const [selectedDay, setSelectedDay] = useState(initialDate);
  // Only show floating tasks if the selectedDay is today
  const showFloatingTasks = isSameDay(selectedDay, new Date());

  const { data: tasksForSelectedDay = [], isLoading } = useQuery({
    queryKey: ["tasks", selectedDay.toISOString()],
    queryFn: () => fetchTasksForDate(selectedDay, showFloatingTasks),
  });

  const { data: overdueTasks = [] } = useQuery({
    queryKey: ["overdueTasks"],
    queryFn: fetchOverdueTasks,
  });
  return {
    selectedDay,
    setSelectedDay,
    tasksForSelectedDay,
    overdueTasks,
    isLoading,
  };
};

export default useSelectedDayTasks;
