import { View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { eachDayOfInterval, format, isBefore, isSameDay, parseISO } from "date-fns";
import { theme } from "@/shared/constants/theme";
import { renderCalendarHeader } from "@/feature/tasks/util/date-formatter";

type MarkedDate = {
  color?: string;
  textColor?: string;
  startingDay?: boolean;
  endingDay?: boolean;
};

type MarkedDates = Record<string, MarkedDate>;

const DATE_COLORS = {
  background: "#EEFBE1",
  text: theme.colors.highlight,
};

const DoubleDatesCalendar = ({
  startDate,
  endDate,
  setEndDate,
}: {
  startDate: Date;
  endDate: Date;
  setEndDate: (v: Date) => void;
}) => {
  const getDatesInRange = (start: Date, end: Date): MarkedDates => {
    const days = eachDayOfInterval({ start, end });
    const dates: MarkedDates = {};

    for (const d of days) {
      const key = format(d, "yyyy-MM-dd");
      dates[key] = {
        color: DATE_COLORS.background,
        textColor: DATE_COLORS.text,
      };
    }

    const keys = Object.keys(dates);
    if (keys.length > 0) {
      dates[keys[0]].startingDay = true;
      dates[keys[keys.length - 1]].endingDay = true;
    }

    return dates;
  };

  const markedDates: MarkedDates = (() => {
    if (!endDate) {
      return {
        [startDate.toDateString()]: {
          startingDay: true,
          endingDay: true,
          color: DATE_COLORS.background,
          textColor: DATE_COLORS.text,
        },
      };
    }

    // Range selection → highlight with period
    return getDatesInRange(startDate, endDate);
  })();

  const onDayPress = (day: DateData) => {
    const selected = parseISO(day.dateString);
    if (isSameDay(startDate, selected) || isBefore(startDate, selected)) {
      setEndDate(selected);
    }

    return;
  };

  return (
    <View className="w-full max-w-md rounded-2xl bg-white p-4 mx-auto">
      <Calendar
        markingType="period"
        markedDates={markedDates}
        onDayPress={onDayPress}
        theme={{
          todayTextColor: "#BAD5FA",
          arrowColor: theme.colors.highlight,
          textDayFontFamily: "BalooBold",
          textDayHeaderFontFamily: "BalooBold",
          textMonthFontFamily: "BalooBold",
        }}
        renderHeader={renderCalendarHeader}
        enableSwipeMonths
      />
    </View>
  );
};

export default DoubleDatesCalendar;
