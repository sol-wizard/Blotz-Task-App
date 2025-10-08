import { View, Text, Pressable } from "react-native";
import React, { useState } from "react";
import { format } from "date-fns";
import { Controller, Control } from "react-hook-form";
import CalendarDatePicker from "./calendar-date-picker";
import { TaskFormField } from "../../models/task-form-schema";

interface DateSelectRangeDayProps {
  control: Control<TaskFormField>;
  nameStart: "startDate";
  nameEnd: "endDate";
  displayStartDate: Date | null;
  displayEndDate: Date | null;
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
  control,
  nameStart,
  nameEnd,
  displayStartDate,
  displayEndDate,
}: DateSelectRangeDayProps) => {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <Controller
      control={control}
      name={nameStart}
      render={({ field: { onChange: onChangeStart } }) => (
        <Controller
          control={control}
          name={nameEnd}
          render={({ field: { onChange: onChangeEnd } }) => (
            <View>
              <View className="flex-col gap-2 items-start justify-center">
                <DateInput
                  label="Start Date"
                  date={displayStartDate}
                  onPress={() => setShowCalendar(true)}
                />
                <DateInput
                  label="End Date"
                  date={displayEndDate}
                  onPress={() => setShowCalendar(true)}
                />
              </View>

              <CalendarDatePicker
                allowRangeSelection
                visible={showCalendar}
                onClose={() => setShowCalendar(false)}
                onSave={(start, end) => {
                  const startD = start ? new Date(start) : null;
                  const endD = end ? new Date(end) : null;

                  onChangeStart(startD);
                  onChangeEnd(endD);
                  setShowCalendar(false);
                }}
              />
            </View>
          )}
        />
      )}
    />
  );
};

export default DateSelectRangeDay;
