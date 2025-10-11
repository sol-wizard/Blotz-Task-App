import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import CalendarDatePicker from "./calendar-date-picker";
import { Controller, Control, UseFormSetValue } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";
import { format } from "date-fns";

interface DateSelectSingleDayProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  nameStart: "startDate";
  displayDate: Date | null;
  isSingleDayTask?: boolean;
}

const DateSelectSingleDay = ({
  control,
  setValue,
  nameStart,
  displayDate,
  isSingleDayTask = true,
}: DateSelectSingleDayProps) => {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <View className="w-full">
      <Controller
        control={control}
        name={nameStart}
        render={({ field: { onChange } }) => {
          return (
            <>
              {/* Date Picker Button */}
              <Pressable
                onPress={() => setShowCalendar(true)}
                className="bg-white p-4 rounded-xl border border-gray-300 active:bg-gray-50"
              >
                <Text
                  className={`font-baloo text-xl ${isSingleDayTask ? "text-slate-700" : "text-slate-400"}`}
                >
                  {displayDate ? format(displayDate, "MMM dd, yyyy") : "Select Date"}
                </Text>
              </Pressable>

              {/* Calendar Modal */}
              <CalendarDatePicker
                allowRangeSelection={false}
                visible={showCalendar}
                onClose={() => setShowCalendar(false)}
                onSave={(selectedDate) => {
                  setShowCalendar(false);
                  if (selectedDate) {
                    const newDate = new Date(selectedDate);
                    // Set both start and end date to the same value for single day
                    onChange(newDate);
                    setValue("endDate", newDate, { shouldValidate: true });
                  }
                }}
              />
            </>
          );
        }}
      />
    </View>
  );
};

export default DateSelectSingleDay;
