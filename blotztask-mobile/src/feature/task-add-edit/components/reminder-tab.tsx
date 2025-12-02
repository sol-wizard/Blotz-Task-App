import { Controller } from "react-hook-form";
import { View, Text, Pressable } from "react-native";
import { format } from "date-fns";
import { useState } from "react";
import TimePicker from "./time-picker";
import { SingleDateCalendar } from "./single-date-calendar";

type Props = {
  control: any;
};

export const ReminderTab = ({ control }: Props) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  return (
    <View className="mb-4">
      <Controller
        control={control}
        name="startDate"
        render={({ field: { onChange: onStartDateChange, value: startDate } }) => {
          return (
            <Controller
              control={control}
              name="endDate"
              render={({ field: { onChange: onEndDateChange } }) => {
                const displayText = startDate ? format(startDate, "MMM dd, yyyy") : "Select Date";
                return (
                  <View className="mb-4">
                    <View className="flex-row justify-between">
                      <Text className="font-baloo text-secondary text-2xl mt-1">Date</Text>
                      <Pressable
                        onPress={() => setShowCalendar((prev) => !prev)}
                        className="bg-background px-4 py-2 rounded-xl"
                      >
                        <Text className="text-xl font-balooThin text-secondary">{displayText}</Text>
                      </Pressable>
                    </View>

                    {showCalendar && <SingleDateCalendar onStartDateChange={onStartDateChange} />}
                  </View>
                );
              }}
            />
          );
        }}
      />

      <Controller
        control={control}
        name="startTime"
        render={({ field: { onChange: onStartTimeChange, value: startTime } }) => {
          return (
            <Controller
              control={control}
              name="endTime"
              render={({ field: { onChange: onEndTimeChange } }) => {
                const handleChange = (selectedTime?: Date) => {
                  if (selectedTime) {
                    onStartTimeChange(selectedTime);
                    onEndTimeChange(selectedTime);
                  }
                };
                return (
                  <View className="justify-center">
                    <View className="flex-row justify-between">
                      <Text className="font-baloo text-secondary text-2xl mt-1">Time</Text>

                      <Pressable
                        onPress={() => {
                          if (!startTime) {
                            onStartTimeChange(new Date());
                            onEndTimeChange(new Date());
                          }
                          setShowTimePicker((prev) => !prev);
                        }}
                        className="bg-background px-4 py-2 rounded-xl"
                      >
                        <Text className="text-xl font-balooThin text-secondary ">
                          {startTime ? format(startTime, "hh:mm a") : "Select Time"}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="items-center">
                      {showTimePicker && (
                        <TimePicker value={startTime} onChange={(v: Date) => handleChange(v)} />
                      )}
                    </View>
                  </View>
                );
              }}
            />
          );
        }}
      />
    </View>
  );
};
