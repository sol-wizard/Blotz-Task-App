import { parseISO } from "date-fns";
import { useState } from "react";
import { Calendar, DateData } from "react-native-calendars";

export const SingleDateCalendar = ({
  onStartDateChange,
}: {
  onStartDateChange: (...event: any[]) => void;
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
                selectedTextColor: "#9AD513",
              },
            }
          : {}
      }
      theme={{
        todayTextColor: "#BAD5FA",
        arrowColor: "#9AD513",
        textDayFontFamily: "BalooBold",
        textDayHeaderFontFamily: "BalooBold",
        textMonthFontFamily: "BalooBold",
        dayTextColor: "#333",
        textDisabledColor: "#bbb",
      }}
      enableSwipeMonths
    />
  );
};
