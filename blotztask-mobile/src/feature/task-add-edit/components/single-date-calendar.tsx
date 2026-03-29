import { useState, useEffect } from "react";
import { theme } from "@/shared/constants/theme";
import { parseISO } from "date-fns";
import { Calendar } from "react-native-calendars";
import { renderCalendarHeader } from "@/feature/calendar/util/date-formatter";
import { CustomCalendarDay } from "./custom-calendar-day";

export const SingleDateCalendar = ({
  defaultStartDate,
  deadlineDate,
  disabledDates = [],
  highlightDates = [],
  eventStartDate,
  eventEndDate,
  isDeadlinePicker = false,
  onStartDateChange,
}: {
  defaultStartDate: string;
  deadlineDate?: string;
  disabledDates?: string[];
  highlightDates?: string[];
  eventStartDate?: string;
  eventEndDate?: string;
  isDeadlinePicker?: boolean;
  onStartDateChange: (date: Date) => void;
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(defaultStartDate);

  useEffect(() => {
    setSelectedDate(defaultStartDate ?? null);
  }, [defaultStartDate]);

  return (
    <Calendar
      onDayPress={(day: any) => {
        const asDate = parseISO(day.dateString);
        setSelectedDate(day.dateString);
        onStartDateChange(asDate);
      }}
      current={selectedDate ?? undefined}
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
      dayComponent={({ date, state }: any) => {
        const isSelected = !isDeadlinePicker && (selectedDate === date.dateString);
        const isDeadline = deadlineDate === date.dateString;
        const isDisabled = disabledDates.includes(date.dateString);
        const isInHighlight = highlightDates.includes(date.dateString);

        const currentMs = parseISO(date.dateString).getTime();
        let isRangeStart = false;
        let isRangeEnd = false;
        let isInEventRange = false;
        
        if (eventStartDate && eventEndDate) {
           const startMs = parseISO(eventStartDate).getTime();
           const endMs = parseISO(eventEndDate).getTime();
           if (currentMs >= startMs && currentMs <= endMs) {
              isRangeStart = currentMs === startMs;
              isRangeEnd = currentMs === endMs;
              isInEventRange = currentMs > startMs && currentMs < endMs;
           }
        }

        return (
          <CustomCalendarDay
            date={date}
            state={state}
            isSelected={isSelected}
            isDeadline={isDeadline}
            isInRange={isInHighlight || isInEventRange}
            isRangeStart={isRangeStart}
            isRangeEnd={isRangeEnd}
            disabled={isDisabled}
            onPress={(d) => {
              setSelectedDate(date.dateString);
              onStartDateChange(d);
            }}
          />
        );
      }}
    />
  );
};
