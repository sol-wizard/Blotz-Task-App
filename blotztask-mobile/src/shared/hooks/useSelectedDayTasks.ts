import { useQuery } from "@tanstack/react-query";
import { fetchTasksForDate } from "../services/task-service";
import { format } from "date-fns";
import { taskKeys } from "../constants/query-key-factory";

const useSelectedDayTasks = ({ selectedDay }: { selectedDay: Date }) => {
  const dayKey = format(selectedDay, "yyyy-MM-dd");

  const { data: selectedDayTasks = [], isLoading } = useQuery({
    queryKey: taskKeys.selectedDay(dayKey),
    queryFn: () => fetchTasksForDate(selectedDay),
  });

  return {
    selectedDayTasks,
    isLoading,
  };
};

export default useSelectedDayTasks;
