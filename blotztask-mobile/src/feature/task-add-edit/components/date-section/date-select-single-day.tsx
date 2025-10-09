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
}

const DateSelectSingleDay = ({
  control,
  setValue,
  nameStart,
  displayDate,
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
                className="bg-gray-100 p-4 rounded-lg border border-gray-300"
              >
                <Text className="text-lg text-gray-700">
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
