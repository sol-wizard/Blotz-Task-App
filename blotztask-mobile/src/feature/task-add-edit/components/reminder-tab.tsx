import { Controller, useFormContext } from "react-hook-form";
import { View, Text, Pressable } from "react-native";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Calendar, DateData } from "react-native-calendars";
import TimePicker from "./time-picker";

type Props = {
  control: any;
};

export const ReminderTab = ({ control }: Props) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { setValue } = useFormContext();

  return (
    <View className="mb-4">
      <Controller
        control={control}
        name="startDate"
        render={({ field: { onChange, value } }) => {
          const displayText = value ? format(value, "MMM dd, yyyy") : "Select Date";

          return (
            <View className="mb-4">
              <View className="flex-row justify-between">
                <Text className="font-baloo text-secondary text-2xl mt-1">Date</Text>
                <Pressable
                  onPress={() => setShowCalendar((prev) => !prev)}
                  className="bg-background px-4 py-2 rounded-xl"
                >
                  <Text className="text-xl font-baloo text-secondary">{displayText}</Text>
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
            <View className="justify-center">
              <View className="flex-row justify-between">
                <Text className="font-baloo text-secondary text-2xl mt-1">Time</Text>

                <Pressable
                  onPress={() => setShowTimePicker((prev) => !prev)}
                  className="bg-background px-4 py-2 rounded-xl"
                >
                  <Text className="text-xl font-baloo text-secondary ">
                    {value ? format(value, "hh:mm a") : "Select time"}
                  </Text>
                </Pressable>
              </View>
              <View className="items-center">
                {showTimePicker && (
                  <TimePicker value={value} onChange={(v: Date) => handleChange(v)} />
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};
