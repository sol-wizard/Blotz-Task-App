import { format } from "date-fns";
import { DailyTaskIndicatorDTO } from "../models/daily-task-indicator-dto";

export const getMarkedDates = ({
  weeklyTaskAvailability,
}: {
  weeklyTaskAvailability: DailyTaskIndicatorDTO[];
}) => {
  const result: Record<string, { marked: boolean }> = {};

  weeklyTaskAvailability.forEach((item) => {
    const dateStr = format(new Date(item.date), "yyyy-MM-dd");

    if (item.hasTask) {
      result[dateStr] = { marked: true };
    }
  });

  return result;
};
