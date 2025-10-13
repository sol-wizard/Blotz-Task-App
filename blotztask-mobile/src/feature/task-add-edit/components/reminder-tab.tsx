import { Controller, useFormContext } from "react-hook-form";
import { View, Text, Pressable } from "react-native";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Calendar, DateData } from "react-native-calendars";
import DateTimePicker from "@react-native-community/datetimepicker";

type Props = {
  control: any;
};

export const ReminderTab = ({ control }: Props) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { setValue } = useFormContext();

  return (
    <View>
      <Controller
        control={control}
        name="startDate"
        render={({ field: { onChange, value } }) => {
          const displayText = value ? format(value, "MMM dd, yyyy") : "Select Date";

          return (
            <View className="mb-4">
              <View className="flex-row justify-between">
                <Text>Date</Text>
                <Pressable onPress={() => setShowCalendar((prev) => !prev)}>
                  <Text className="font-baloo text-xl">{displayText}</Text>
                </Pressable>
              </View>

              {showCalendar && (
                <Calendar
                  onDayPress={(day: DateData) => {
                    const asDate = parseISO(day.dateString);

                    setSelectedDate(day.dateString);
                    onChange(asDate);
                    setValue("endDate", asDate);
                  }}
                  markedDates={
                    selectedDate
                      ? {
                          [selectedDate]: {
                            selected: true,
                            selectedColor: "#EEFBE1",
                            selectedTextColor: "#9AD513",
                          },
                        }
                      : {}
                  }
                  theme={{
                    todayTextColor: "#BAD5FA",
                    arrowColor: "#9AD513",
                    textDayFontFamily: "BalooBold",
                    textDayHeaderFontFamily: "BalooBold",
                    textMonthFontFamily: "BalooBold",
                    dayTextColor: "#333",
                    textDisabledColor: "#bbb",
                  }}
                  enableSwipeMonths
                />
              )}
            </View>
          );
        }}
      />

      <Controller
        control={control}
        name="startTime"
        render={({ field: { onChange, value } }) => {
          const handleChange = (selectedTime?: Date) => {
            if (selectedTime) {
              onChange(selectedTime);
              setValue("endTime", selectedTime);
            }
          };

          return (
            <View>
              <View className="flex-row justify-between">
                <Text>Time</Text>

                <Pressable onPress={() => setShowTimePicker((prev) => !prev)}>
                  <Text className="font-baloo text-lg text-slate-700">
                    {value ? format(value, "hh:mm a") : "Select a time"}
                  </Text>
                </Pressable>
              </View>
              <View className="items-center">
                {showTimePicker && (
                  <DateTimePicker
                    value={value ?? new Date()}
                    mode="time"
                    display="spinner"
                    onChange={(_, selectedDate) => {
                      if (selectedDate) {
                        handleChange(selectedDate);
                      }
                    }}
                    textColor="#000"
                  />
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};
