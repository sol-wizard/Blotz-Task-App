import { View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { eachDayOfInterval, format, isBefore, isSameDay, parseISO } from "date-fns";
import { theme } from "@/shared/constants/theme";
import { renderCalendarHeader } from "@/feature/calendar/util/date-formatter";
import { CustomCalendarDay } from "./custom-calendar-day";

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
  const getDatesInRange = (start: Date, end: Date) => {
    const days = eachDayOfInterval({ start, end });
    const dates: Record<string, any> = {};

    for (const d of days) {
      dates[format(d, "yyyy-MM-dd")] = { isInRange: true };
    }
    const keys = Object.keys(dates);
    if (keys.length === 1) {
      dates[keys[0]] = { isRangeStart: true, isRangeEnd: true, isInRange: true };
    } else if (keys.length > 1) {
      dates[keys[0]] = { ...dates[keys[0]], isRangeStart: true };
      dates[keys[keys.length - 1]] = { ...dates[keys[keys.length - 1]], isRangeEnd: true };
    }
    return dates;
  };

  const markedDates: Record<string, any> = (() => {
    if (!endDate) {
      return { [format(startDate, "yyyy-MM-dd")]: { isRangeStart: true, isRangeEnd: true, isInRange: true } };
    }
    if (isBefore(endDate, startDate) && !isSameDay(endDate, startDate)) {
      return {
        [format(startDate, "yyyy-MM-dd")]: { isRangeStart: true, isRangeEnd: true, isInRange: true },
        [format(endDate, "yyyy-MM-dd")]: { isInvalid: true, isRangeStart: true, isRangeEnd: true, isInRange: true },
      };
    }
    return getDatesInRange(startDate, endDate);
  })();

  const onDayPress = (day: DateData) => {
    const selected = parseISO(day.dateString);
    setEndDate(selected);
  };

  return (
    <View className="w-full max-w-md rounded-2xl bg-white p-4 mx-auto">
      <Calendar
        onDayPress={onDayPress}
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
          const props = markedDates[date.dateString] || {};
          const isDeadline = deadlineDate === date.dateString;
          const isDisabled = disabledDates.includes(date.dateString);

          return (
            <CustomCalendarDay
              date={date}
              state={state}
              isSelected={false}
              isDeadline={isDeadline}
              isInRange={props.isInRange}
              isRangeStart={props.isRangeStart}
              isRangeEnd={props.isRangeEnd}
              isInvalid={props.isInvalid}
              disabled={isDisabled}
              onPress={() => onDayPress(date)}
            />
          );
        }}
      />
    </View>
  );
};

export default DoubleDatesCalendar;
