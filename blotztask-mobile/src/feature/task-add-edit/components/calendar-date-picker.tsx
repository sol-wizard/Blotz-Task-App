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
  allowRangeSelection: boolean;
  visible: boolean;
  onClose: () => void;
  onSave: (startDate: string | null, endDate: string | null) => void;
}

const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  allowRangeSelection,
  visible,
  onClose,
  onSave,
}) => {
  const [startDate, setStartDate] = useState<string | null>(null);
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
      setStartDate(day.dateString);
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
    <Modal
      isVisible={visible}
      backdropColor="black"
      backdropOpacity={0.5}
      onBackdropPress={handleClose}
      presentationStyle="overFullScreen"
    >
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

        <View className="flex-row justify-end mt-3 space-x-3 gap-2">
          <TouchableOpacity onPress={handleClose} className="px-4 py-2 rounded-lg bg-gray-200">
            <Text className="text-gray-700 font-medium">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            className={`px-4 py-2 rounded-lg ${
              allowRangeSelection && (!startDate || !endDate) ? "bg-gray-300" : "bg-lime-400"
            }`}
            disabled={allowRangeSelection && (!startDate || !endDate)}
          >
            <Text className="text-white font-medium">Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default CalendarDatePicker;
