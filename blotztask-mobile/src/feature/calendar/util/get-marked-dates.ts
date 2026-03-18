import { format } from "date-fns";
import { DailyTaskIndicatorDTO } from "../models/daily-task-indicator-dto";
import { theme } from "@/shared/constants/theme";

export const getMarkedDates = ({
  weeklyTaskAvailability,
  selectedDay,
}: {
  weeklyTaskAvailability: DailyTaskIndicatorDTO[];
  selectedDay: Date;
}) => {
  const result: Record<string, any> = {};

  //   selected day
  const selectedDayStr = format(selectedDay, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isTodaySelected = selectedDayStr === todayStr;

  // day with tasks
  weeklyTaskAvailability.forEach((item) => {
    const dateStr = format(new Date(item.date), "yyyy-MM-dd");

    if (!result[dateStr]) {
      result[dateStr] = {};
    }

    if (item.hasTask) {
      result[dateStr].marked = true;
      result[dateStr].dotColor =
        dateStr === selectedDayStr // 加这个判断
          ? "#FFFFFF"
          : theme.colors.highlight;
    }
  });

  if (!result[selectedDayStr]) {
    result[selectedDayStr] = {};
  }
  result[selectedDayStr] = {
    ...result[selectedDayStr],
    selected: true,
    selectedColor: theme.colors.highlight,
    selectedTextColor: "#FFFFFF",
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

export const getSelectedDates = ({ selectedDay }: { selectedDay: Date }) => {
  const result: Record<string, any> = {};

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
    selectedColor: theme.colors.highlight,
    selectedTextColor: "#FFFFFF",
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
