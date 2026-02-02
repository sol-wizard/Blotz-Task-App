import { useQuery } from "@tanstack/react-query";
// import { fetchFloatingTasks } from "../services/task-service";
import { fetchTasksForDate } from "../services/task-service";
import { startOfDay } from "date-fns";
import { taskKeys } from "../constants/query-key-factory";
import { convertToDateTimeOffset } from "../util/convert-to-datetimeoffset";

const useSelectedDayTasks = ({ selectedDay }: { selectedDay: Date }) => {
  const dayKey = convertToDateTimeOffset(startOfDay(selectedDay));

  const { data: selectedDayTasks = [], isLoading } = useQuery({
    queryKey: taskKeys.selectedDay(dayKey),
    queryFn: () => fetchTasksForDate(selectedDay, false),
    // queryFn: () => fetchFloatingTasks(),
  });

  return {
    selectedDayTasks,
    isLoading,
  };
};

export default useSelectedDayTasks;
