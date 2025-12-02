import { useState } from "react";
import { Pressable, View, Text } from "react-native";
import { SingleDateCalendar } from "./single-date-calendar";
import { format } from "date-fns";
import { useController } from "react-hook-form";
import TimePicker from "./time-picker";

export const DateTimeSelector = ({ control }: { control: any }) => {
  const [activeSelector, setActiveSelector] = useState<
    "startDate" | "startTime" | "endDate" | "endTime" | null
  >(null);

  const {
    field: { value: startDateValue, onChange: onChangeStartDate },
  } = useController({
    control,
    name: "startDate",
  });

  const {
    field: { value: startTimeValue, onChange: onChangeStartTime },
  } = useController({
    control,
    name: "startTime",
  });

  const {
    field: { value: endValue, onChange: onChangeEnd },
  } = useController({
    control,
    name: "endDate",
  });

  const {
    field: { value: endTimeValue, onChange: onChangeEndTime },
  } = useController({
    control,
    name: "endTime",
  });

  return (
    <View>
      <View>
        <View className="flex-row justify-between mb-4">
          <Text className="font-baloo text-secondary text-2xl mt-1">Start</Text>

          <View className="flex-row">
            <Pressable
              onPress={() =>
                setActiveSelector((prev) => (prev === "startDate" ? null : "startDate"))
              }
              className="bg-background px-4 py-2 rounded-xl mr-2"
            >
              <Text className="text-xl font-balooThin text-secondary">
                {startDateValue ? format(startDateValue, "MMM dd, yyyy") : "Select Date"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setActiveSelector((prev) => (prev === "startTime" ? null : "startTime"))
              }
              className="bg-background px-4 py-2 rounded-xl"
            >
              <Text className="text-xl font-balooThin text-secondary ">
                {startTimeValue ? format(startTimeValue, "hh:mm a") : "Select Time"}
              </Text>
            </Pressable>
          </View>
        </View>

        {activeSelector === "startDate" && (
          <SingleDateCalendar onStartDateChange={onChangeStartDate} />
        )}
        {activeSelector === "startTime" && (
          <TimePicker value={startTimeValue} onChange={(v: Date) => onChangeStartTime(v)} />
        )}
      </View>

      <View>
        <View className="flex-row justify-between">
          <Text className="font-baloo text-secondary text-2xl mt-1">End</Text>

          <View className="flex-row">
            <Pressable
              onPress={() => setActiveSelector((prev) => (prev === "endDate" ? null : "endDate"))}
              className="bg-background px-4 py-2 rounded-xl mr-2"
            >
              <Text className="text-xl font-balooThin text-secondary">
                {endValue ? format(endValue, "MMM dd, yyyy") : "Select Date"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveSelector((prev) => (prev === "endTime" ? null : "endTime"))}
              className="bg-background px-4 py-2 rounded-xl"
            >
              <Text className="text-xl font-balooThin text-secondary ">
                {endTimeValue ? format(endTimeValue, "hh:mm a") : "Select Time"}
              </Text>
            </Pressable>
          </View>
        </View>
        {activeSelector === "endDate" && <SingleDateCalendar onStartDateChange={onChangeEnd} />}
        {activeSelector === "endTime" && (
          <TimePicker value={endTimeValue} onChange={(v: Date) => onChangeEndTime(v)} />
        )}
      </View>
    </View>
  );
};
