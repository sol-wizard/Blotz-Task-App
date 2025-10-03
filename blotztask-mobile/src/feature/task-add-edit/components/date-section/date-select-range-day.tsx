import { View, Text, Pressable } from "react-native";
import React, { useState } from "react";
import { format } from "date-fns";
import CalendarDatePicker from "./calendar-date-picker";

interface DateSelectRangeDayProps {
  onChange: (value: { selectedStart: Date; selectedEnd: Date }) => void;
  defaultStart?: Date | null;
  defaultEnd?: Date | null;
}

const DateInput = ({
  label,
  date,
  onPress,
}: {
  label: string;
  date: Date | null;
  onPress: () => void;
}) => {
  const formatDate = (date: Date | null) => (date ? format(date, "MM/dd/yy") : "MM/DD/YY");

  return (
    <View className="flex-row justify-between gap-4 items-center">
      <Text className="w-20">{label}</Text>
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-center px-3 py-2 rounded-xl border border-gray-300 bg-white"
      >
        <Text className={`text-base ${date ? "text-slate-700" : "text-slate-400"}`}>
          {formatDate(date)}
        </Text>
      </Pressable>
    </View>
  );
};

const DateSelectRangeDay = ({
  onChange,
  defaultStart = null,
  defaultEnd = null,
}: DateSelectRangeDayProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(defaultStart ?? null);
  const [endDate, setEndDate] = useState<Date | null>(defaultEnd ?? null);

  const openCalendar = () => setShowCalendar(true);

  return (
    <View>
      <View className="flex-col gap-2 items-start justify-center">
        <DateInput label="Start Date" date={startDate} onPress={openCalendar} />
        <DateInput label="End Date" date={endDate} onPress={openCalendar} />
      </View>

      {/* Calendar Modal */}
      <CalendarDatePicker
        allowRangeSelection={true}
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSave={(start, end) => {
          const startD = start ? new Date(start) : null;
          const endD = end ? new Date(end) : null;

          setStartDate(startD);
          setEndDate(endD);
          onChange({ selectedStart: startD!, selectedEnd: endD! });
          setShowCalendar(false);
        }}
      />
    </View>
  );
};

export default DateSelectRangeDay;
