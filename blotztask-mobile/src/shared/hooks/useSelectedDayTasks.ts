import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchTasksForDate } from "../services/task-service";
import { taskKeys } from "../constants/query-key-factory";
import { toDayKey } from "../util/to-day-key";

export const selectedDayTasksQuery = (selectedDay: Date) =>
  queryOptions({
    queryKey: taskKeys.selectedDay(toDayKey(selectedDay)),
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
