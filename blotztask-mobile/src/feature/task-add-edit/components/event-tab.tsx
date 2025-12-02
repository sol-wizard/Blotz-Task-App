import { useState } from "react";
import { Pressable, View, Text } from "react-native";
import { SingleDateCalendar } from "./single-date-calendar";
import { addDays, differenceInCalendarDays, format, isAfter } from "date-fns";
import { useController } from "react-hook-form";
import TimePicker from "./time-picker";
import DoubleDatesCalendar from "./double-dates-calendar";

export const EventTab = ({ control }: { control: any }) => {
  const [activeSelector, setActiveSelector] = useState<
    "startDate" | "startTime" | "endDate" | "endTime" | null
  >(null);

  const {
    field: { value: startDateValue, onChange: startDateOnChange },
  } = useController({
    control,
    name: "startDate",
  });

  const {
    field: { value: startTimeValue, onChange: startTimeOnChange },
  } = useController({
    control,
    name: "startTime",
  });

  const {
    field: { value: endDateValue, onChange: endDateOnChange },
  } = useController({
    control,
    name: "endDate",
  });

  const {
    field: { value: endTimeValue, onChange: endTimeOnChange },
  } = useController({
    control,
    name: "endTime",
  });

  const handleStartDateChange = (nextDate: Date) => {
    const previousSpan =
      startDateValue && endDateValue
        ? Math.max(differenceInCalendarDays(endDateValue, startDateValue), 0)
        : 0;

    startDateOnChange(nextDate);

    if (endDateValue && isAfter(nextDate, endDateValue)) {
      endDateOnChange(addDays(nextDate, previousSpan));
    }
  };

  return (
    <View className="mb-4">
      <View className="mb-4">
        <View className="flex-row justify-between">
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
          <SingleDateCalendar onStartDateChange={handleStartDateChange} />
        )}
        {activeSelector === "startTime" && (
          <TimePicker value={startTimeValue} onChange={(v: Date) => startTimeOnChange(v)} />
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
                {endDateValue ? format(endDateValue, "MMM dd, yyyy") : "Select Date"}
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
        {activeSelector === "endDate" && (
          <DoubleDatesCalendar
            startDate={startDateValue}
            endDate={endDateValue}
            setEndDate={endDateOnChange}
          />
        )}
        {activeSelector === "endTime" && (
          <TimePicker value={endTimeValue} onChange={(v: Date) => endTimeOnChange(v)} />
        )}
      </View>
    </View>
  );
};
