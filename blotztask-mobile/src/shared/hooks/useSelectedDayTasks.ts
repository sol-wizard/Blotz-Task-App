import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchTasksForDate } from "../services/task-service";
import { format } from "date-fns";
import { taskKeys } from "../constants/query-key-factory";

export const selectedDayTasksQuery = (selectedDay: Date) =>
  queryOptions({
    queryKey: taskKeys.selectedDay(format(selectedDay, "yyyy-MM-dd")),
    queryFn: () => fetchTasksForDate(selectedDay),
  });

const useSelectedDayTasks = ({ selectedDay }: { selectedDay: Date }) => {
  const {
    data: selectedDayTasks = [],
    isLoading,
    isSuccess,
  } = useQuery(selectedDayTasksQuery(selectedDay));

  return {
    selectedDayTasks,
    isLoading,
    isSuccess,
  };
};

export default useSelectedDayTasks;
