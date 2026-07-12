import { DailyTaskIndicatorDTO } from "../models/daily-task-indicator-dto";

export const getMarkedDates = ({
  weeklyTaskAvailability,
}: {
  weeklyTaskAvailability: DailyTaskIndicatorDTO[];
}) => {
  const result: Record<string, { marked: boolean }> = {};

  weeklyTaskAvailability.forEach((item) => {
    if (item.hasTask) {
      result[item.date] = { marked: true };
    }
  });

  return result;
};
