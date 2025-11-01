import { Controller } from "react-hook-form";
import { View, Text, Pressable } from "react-native";
import { format, startOfDay } from "date-fns";
import { useState } from "react";
import CalendarDatePicker from "./calendar-date-picker";
import { TimePickerController } from "./time-picker-controller";

type Props = {
  control: any;
};

export const EventTab = ({ control }: Props) => {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <View>
      <Controller
        control={control}
        name="startDate"
        render={({ field: { onChange: onChangeStart, value: startValue } }) => (
          <Controller
            control={control}
            name="endDate"
            render={({ field: { onChange: onChangeEnd, value: endValue } }) => (
              <View>
                <View className="flex-row justify-between mb-4">
                  <Text className="font-baloo text-secondary text-2xl mt-1">Start</Text>

                  <View className="flex-row">
                    <Pressable
                      onPress={() => setShowCalendar((prev) => !prev)}
                      className="bg-background px-4 py-2 rounded-xl mr-2"
                    >
                      <Text className="text-xl font-balooThin text-secondary">
                        {startValue ? format(startValue, "MMM dd, yyyy") : "Select Date"}
                      </Text>
                    </Pressable>

                    <TimePickerController control={control} name="startTime" />
                  </View>
                </View>

                <View className="flex-row justify-between">
                  <Text className="font-baloo text-secondary text-2xl mt-1">End</Text>

                  <View className="flex-row">
                    <Pressable
                      onPress={() => setShowCalendar((prev) => !prev)}
                      className="bg-background px-4 py-2 rounded-xl mr-2"
                    >
                      <Text className="text-xl font-balooThin text-secondary">
                        {endValue ? format(endValue, "MMM dd, yyyy") : "Select Date"}
                      </Text>
                    </Pressable>

                    <TimePickerController control={control} name="endTime" />
                  </View>
                </View>

                <CalendarDatePicker
                  allowRangeSelection
                  visible={showCalendar}
                  onClose={() => setShowCalendar(false)}
                  onSave={(start, end) => {
                    const startD = start ? startOfDay(new Date(start)) : null;
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
    </View>
  );
};
