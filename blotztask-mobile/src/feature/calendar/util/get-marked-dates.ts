import { format } from "date-fns";
import { TaskDayDTO } from "../models/task-day-dto";

export const getMarkedDates = ({
  weeklyTaskAvability,
  selectedDay,
}: {
  weeklyTaskAvability: TaskDayDTO[];
  selectedDay: Date;
}) => {
  const result: Record<string, any> = {};
  // day with tasks
  weeklyTaskAvability.forEach((item) => {
    const dateStr = format(new Date(item.date), "yyyy-MM-dd");

    if (!result[dateStr]) {
      result[dateStr] = {};
    }

    if (item.hasTask) {
      result[dateStr].marked = true;
      result[dateStr].dotColor = "#98C802";
    }
  });

  //   selected day
  const selectedDayStr = format(selectedDay, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isTodaySelected = selectedDayStr === todayStr;

  if (!result[selectedDayStr]) {
    result[selectedDayStr] = {};
  }
  result[selectedDayStr] = {
    ...result[selectedDayStr],
    selected: true,
    selectedColor: "#EBF0FE",
    selectedTextColor: isTodaySelected ? "#000000" : "#8C8C8C",
  };

  //   today
  if (!result[todayStr]) {
    result[todayStr] = {};
  }
  result[todayStr] = {
    ...result[todayStr],
    customTextStyle: {
      color: "#000000",
    },
  };

  return result;
};
