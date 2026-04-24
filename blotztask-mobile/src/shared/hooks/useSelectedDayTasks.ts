import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchTasksForDate } from "../services/task-service";
import { startOfDay } from "date-fns";
import { taskKeys } from "../constants/query-key-factory";
import { convertToDateTimeOffset } from "../util/convert-to-datetimeoffset";

const useSelectedDayTasks = ({ selectedDay }: { selectedDay: Date }) => {
  const dayKey = convertToDateTimeOffset(startOfDay(selectedDay));

  const { data: selectedDayTasks } = useSuspenseQuery({
    queryKey: taskKeys.selectedDay(dayKey),
    queryFn: () => fetchTasksForDate(selectedDay, true),
  });

  return {
    selectedDayTasks,
  };
};

export default useSelectedDayTasks;
