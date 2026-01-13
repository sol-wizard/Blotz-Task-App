import { theme } from "@/shared/constants/theme";
import { parseISO } from "date-fns";
import { useState } from "react";
import { Calendar, DateData } from "react-native-calendars";
import { renderCalendarHeader } from "@/feature/calendar/util/date-formatter";

export const SingleDateCalendar = ({
  defaultStartDate,
  onStartDateChange,
}: {
  defaultStartDate: string;
  onStartDateChange: (...event: any[]) => void;
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(defaultStartDate);

  return (
    <Calendar
      onDayPress={(day: DateData) => {
        const asDate = parseISO(day.dateString);

        setSelectedDate(day.dateString);
        onStartDateChange(asDate);
      }}
      markedDates={
        selectedDate
          ? {
              [selectedDate]: {
                selected: true,
                selectedColor: "#EEFBE1",
                selectedTextColor: theme.colors.highlight,
              },
            }
          : {}
      }
      theme={{
        todayTextColor: "#BAD5FA",
        arrowColor: theme.colors.highlight,
        textDayFontFamily: "BalooBold",
        textDayHeaderFontFamily: "BalooBold",
        textMonthFontFamily: "BalooBold",
        dayTextColor: "#333",
        textDisabledColor: "#bbb",
      }}
      renderHeader={renderCalendarHeader}
      enableSwipeMonths
    />
  );
};
