import { Controller } from "react-hook-form";
import { View, Text, Pressable } from "react-native";
import { format } from "date-fns";
import { useState } from "react";

import CalendarDatePicker from "./calendar-date-picker";

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
                <View className="flex-row justify-between">
                  <Text className="font-baloo text-xl">Start</Text>
                  <Pressable onPress={() => setShowCalendar((prev) => !prev)}>
                    <Text className="font-baloo text-xl">
                      {startValue ? format(startValue, "MMM dd, yyyy") : "Select Date"}
                    </Text>
                  </Pressable>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-baloo text-xl">End</Text>
                  <Pressable onPress={() => setShowCalendar((prev) => !prev)}>
                    <Text className="font-baloo text-xl">
                      {endValue ? format(endValue, "MMM dd, yyyy") : "Select Date"}
                    </Text>
                  </Pressable>
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
    </View>
  );
};
