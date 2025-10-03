import { View, Text, Pressable } from "react-native";
import React, { useState } from "react";
import { format } from "date-fns";
import CalendarDatePicker from "./calendar-date-picker";

const DateInput = ({
  label,
  date,
  onPress,
  formatDate,
}: {
  label: string;
  date: string | null;
  onPress: () => void;
  formatDate: (dateString: string | null) => string;
}) => {
  return (
    <View className="flex-row justify-between gap-4 items-center">
      <Text className="w-20">{label}</Text>
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-center px-3 py-2 rounded-xl border border-gray-300 bg-white"
      >
        <Text className={`text-base ${date ? "text-slate-700" : "text-slate-400"}`}>
          {date ? formatDate(date) : "MM/DD/YY"}
        </Text>
      </Pressable>
    </View>
  );
};

const DateSelectRangeDay = () => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(new Date().toISOString());
  const [endDate, setEndDate] = useState<string | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "MM/DD/YY";
    return format(new Date(dateString), "MM/dd/yy");
  };

  return (
    <View>
      <View className="flex-col gap-2 items-start justify-center">
        <DateInput
          label="Start Date"
          date={startDate}
          onPress={() => {
            setStartDate(startDate ? startDate : new Date().toISOString());
            setShowCalendar(true);
          }}
          formatDate={formatDate}
        />
        <DateInput
          label="End Date"
          date={endDate}
          onPress={() => {
            setEndDate(endDate ? endDate : new Date().toISOString());
            setShowCalendar(true);
          }}
          formatDate={formatDate}
        />
      </View>
      {/* Calendar Modal */}
      <CalendarDatePicker
        allowRangeSelection={true}
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSave={(start, end) => {
          setStartDate(start);
          setEndDate(end);
          setShowCalendar(false);
        }}
      />
    </View>
  );
};

export default DateSelectRangeDay;
