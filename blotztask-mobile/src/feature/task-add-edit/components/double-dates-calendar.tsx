import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Modal from "react-native-modal";
import { Calendar } from "react-native-calendars";
import { eachDayOfInterval, format, isAfter, parseISO } from "date-fns";

type MarkedDate = {
  color?: string;
  textColor?: string;
  startingDay?: boolean;
  endingDay?: boolean;
};

type MarkedDates = Record<string, MarkedDate>;

const DATE_COLORS = {
  background: "#EEFBE1",
  text: "#9AD513",
};

interface CalendarDatePickerProps {
  startDate: string | null;
  allowRangeSelection: boolean;
  onClose: () => void;
  onSave: (startDate: string | null, endDate: string | null) => void;
}

const DoubleDatesCalendar: React.FC<CalendarDatePickerProps> = ({
  startDate,
  allowRangeSelection,
  onClose,
  onSave,
}) => {
  const [endDate, setEndDate] = useState<string | null>(null);

  const getDatesInRange = (start: string, end: string): MarkedDates => {
    const startObj = parseISO(start);
    const endObj = parseISO(end);

    const days = eachDayOfInterval({ start: startObj, end: endObj });
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

  const onDayPress = (day: { dateString: string }) => {
    if (!allowRangeSelection) {
      setEndDate(null);
      return;
    }

    if (!startDate) {
      setStartDate(day.dateString);
      setEndDate(null);
      return;
    }

    if (!endDate) {
      if (day.dateString === startDate) {
        setEndDate(startDate);
      } else if (isAfter(parseISO(day.dateString), parseISO(startDate))) {
        setEndDate(day.dateString);
      } else {
        setStartDate(day.dateString);
        setEndDate(null);
      }
      return;
    }

    setStartDate(day.dateString);
    setEndDate(null);
  };

  const markedDates: MarkedDates = (() => {
    if (!startDate) return {};

    if (!endDate) {
      return {
        [startDate]: {
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

  const handleConfirm = () => {
    onSave(startDate, endDate);
    handleClose();
  };

  const handleClose = () => {
    setStartDate(null);
    setEndDate(null);
    onClose();
  };

  return (
    <View className="w-full max-w-md rounded-2xl bg-white p-4 mx-auto">
      <Calendar
        markingType="period"
        markedDates={markedDates}
        onDayPress={onDayPress}
        theme={{
          todayTextColor: "#BAD5FA",
          arrowColor: "#9AD513",
          textDayFontFamily: "BalooBold",
          textDayHeaderFontFamily: "BalooBold",
          textMonthFontFamily: "BalooBold",
        }}
        enableSwipeMonths
      />

      {startDate && <Text className="mt-2 text-gray-700">Start: {startDate}</Text>}
      {endDate && <Text className="mt-1 text-gray-700">End: {endDate}</Text>}
    </View>
  );
};

export default DoubleDatesCalendar;
