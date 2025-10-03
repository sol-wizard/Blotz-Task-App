import { useState } from "react";
import { View, Text } from "react-native";
import CalendarDatePicker from "./calendar-date-picker";
import { RadioButton } from "react-native-paper";
import { isSameDay } from "date-fns";
import { Controller, Control, UseFormSetValue } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";
import { resetDefaultTimeValues } from "../../task-form";

interface DateSelectSingleDayProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  nameStart: "startDate";
  nameEnd: "endDate";
  startDate: Date | null;
}

const getInitialSelected = (value: Date | null) => {
  if (!value) return "";
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(value, today)) {
    return "Today";
  } else if (isSameDay(value, tomorrow)) {
    return "Tomorrow";
  } else {
    return "Select Date";
  }
};

const DateSelectSingleDay = ({
  control,
  setValue,
  nameStart,
  nameEnd,
  startDate,
}: DateSelectSingleDayProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selected, setSelected] = useState(getInitialSelected(startDate ?? null));

  return (
    <View className="w-full">
      <Controller
        control={control}
        name={nameStart}
        render={({ field: { onChange: onChangeStart, value: valueStart } }) => (
          <Controller
            control={control}
            name={nameEnd}
            render={({ field: { onChange: onChangeEnd, value: valueEnd } }) => {
              const handleSelect = (valueStr: string) => {
                setSelected(valueStr);
                if (valueStr === "Today") {
                  const today = new Date();
                  onChangeStart(new Date(today));
                  onChangeEnd(new Date(today));
                  resetDefaultTimeValues(today, today, setValue);
                } else if (valueStr === "Tomorrow") {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  onChangeStart(new Date(tomorrow));
                  onChangeEnd(new Date(tomorrow));
                  resetDefaultTimeValues(tomorrow, tomorrow, setValue);
                } else if (valueStr === "Select Date") {
                  setShowCalendar(true);
                }
              };

              return (
                <>
                  <RadioButton.Group onValueChange={handleSelect} value={selected}>
                    <View className="flex-row justify-start gap-12">
                      {["Today", "Tomorrow"].map((option) => (
                        <View key={option} className="flex-row items-center gap-2">
                          <View
                            className={`rounded-full p-1 flex justify-center items-center ${
                              selected === option ? "bg-blue-100" : "bg-white"
                            }`}
                            style={{ transform: [{ scale: 0.5 }] }}
                          >
                            <RadioButton value={option} color="#B0D0FA" />
                          </View>
                          <Text className="text-lg">{option}</Text>
                        </View>
                      ))}
                    </View>

                    <View className="flex-row justify-start items-center gap-2 mt-3">
                      <View
                        className={`rounded-full p-1 flex justify-center items-center ${
                          selected === "Select Date" ? "bg-blue-100" : "bg-white"
                        }`}
                        style={{ transform: [{ scale: 0.5 }] }}
                      >
                        <RadioButton value="Select Date" color="#B0D0FA" />
                      </View>
                      <Text className="text-lg">Select Date</Text>
                    </View>
                  </RadioButton.Group>

                  {/* Calendar Modal */}
                  <CalendarDatePicker
                    allowRangeSelection={false}
                    visible={showCalendar}
                    onClose={() => setShowCalendar(false)}
                    onSave={(selectedDate) => {
                      setShowCalendar(false);
                      if (selectedDate) {
                        onChangeStart(new Date(selectedDate));
                        onChangeEnd(new Date(selectedDate));
                        resetDefaultTimeValues(
                          new Date(selectedDate),
                          new Date(selectedDate),
                          setValue,
                        );
                        setSelected("Select Date");
                      }
                    }}
                  />
                </>
              );
            }}
          />
        )}
      />
    </View>
  );
};

export default DateSelectSingleDay;
