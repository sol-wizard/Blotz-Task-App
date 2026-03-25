import { View } from "react-native";
import { Calendar } from "react-native-calendars";
import { format, parseISO } from "date-fns";
import { theme } from "@/shared/constants/theme";
import { renderCalendarHeader } from "@/feature/calendar/util/date-formatter";
import { CustomCalendarDay } from "./custom-calendar-day";

// Constants and types unused now

const DoubleDatesCalendar = ({
  startDate,
  endDate,
  deadlineDate,
  disabledDates = [],
  setEndDate,
  current,
}: {
  startDate: Date;
  endDate: Date;
  deadlineDate?: string;
  disabledDates?: string[];
  setEndDate: (v: Date) => void;
  current: string;
}) => {
  return (
    <View className="w-full max-w-md rounded-2xl bg-white p-4 mx-auto">
      <Calendar
        // show endDate's month if present, otherwise startDate's month
        current={current}
        theme={{
          todayTextColor: "#BAD5FA",
          arrowColor: theme.colors.highlight,
          textDayFontFamily: "BalooBold",
          textDayHeaderFontFamily: "BalooBold",
          textMonthFontFamily: "BalooBold",
        }}
        renderHeader={renderCalendarHeader}
        enableSwipeMonths
        dayComponent={({ date, state }: any) => {
          const isDeadline = deadlineDate === date.dateString;
          const isDisabled = disabledDates.includes(date.dateString);

          const currentMs = parseISO(date.dateString).getTime();
          const startMs = parseISO(format(startDate, "yyyy-MM-dd")).getTime();
          const endMs = endDate ? parseISO(format(endDate, "yyyy-MM-dd")).getTime() : startMs;

          let isRangeStart = false;
          let isRangeEnd = false;
          let isInRange = false;
          let isInvalid = false;

          if (endMs >= startMs) {
            isRangeStart = currentMs === startMs;
            isRangeEnd = currentMs === endMs;
            isInRange = currentMs > startMs && currentMs < endMs;
          } else {
             // Invalid range selection
            isRangeStart = currentMs === startMs;
            if (currentMs === endMs) {
              isInvalid = true;
            }
          }

          return (
            <CustomCalendarDay
              date={date}
              state={state}
              isSelected={false}
              isDeadline={isDeadline}
              isRangeStart={isRangeStart}
              isRangeEnd={isRangeEnd}
              isInRange={isInRange}
              isInvalid={isInvalid}
              disabled={isDisabled}
              onPress={(d) => setEndDate(d)}
            />
          );
        }}
      />
    </View>
  );
};

export default DoubleDatesCalendar;
