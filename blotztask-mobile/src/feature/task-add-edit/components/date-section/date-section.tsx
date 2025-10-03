import { View, Text, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { Checkbox } from "react-native-paper";
import DateSelectSingleDay from "./date-select-single-day";
import DateSelectRangeDay from "./date-select-range-day";
import { TaskFormField } from "../../models/task-form-schema";
import { Control, UseFormSetValue, useWatch } from "react-hook-form";

interface DateSectionProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  defaultDateType: "1-day" | "multi-day" | undefined;
  dateState: {
    enableDate: boolean;
    setEnableDate: React.Dispatch<React.SetStateAction<boolean>>;
  };
}

const clearTimeValues = (setValue: UseFormSetValue<TaskFormField>) => {
  setValue("startDate", null, { shouldValidate: true });
  setValue("startTime", null, { shouldValidate: true });
  setValue("endDate", null, { shouldValidate: true });
  setValue("endTime", null, { shouldValidate: true });
};

const DateSection = ({ control, defaultDateType, setValue, dateState }: DateSectionProps) => {
  const { enableDate, setEnableDate } = dateState;
  const [activeTab, setActiveTab] = useState<"1-day" | "multi-day" | undefined>(defaultDateType);
  const startTime = useWatch({ control, name: "startTime" });

  const handleDateToggle = () => {
    const newEnableDate = !enableDate;
    setEnableDate(newEnableDate);
    clearTimeValues(setValue);

    if (newEnableDate) {
      setActiveTab("1-day");
      // Default to range type, that is, time range 00:00 - 23:59 when enabling date
      setValue("timeType", "range", { shouldValidate: true });
    } else {
      setValue("timeType", null, { shouldValidate: true });
      setActiveTab(undefined); // reset activeTab when disabled
    }
  };
  return (
    <View className="flex-col gap-4 mb-8">
      <View className="flex-row items-center justify-between">
        {/* Date Label */}
        <View className="flex-row gap-2 items-center ">
          <View className="bg-blue-100 rounded-lg" style={{ transform: [{ scale: 0.7 }] }}>
            <Checkbox
              status={enableDate ? "checked" : "unchecked"}
              onPress={handleDateToggle}
              color="#B0D0FA"
            />
          </View>
          <Text className="font-balooBold text-3xl leading-normal">Date</Text>
        </View>

        {/* Segmented Control */}
        {enableDate && (
          <View className="flex-row items-stretch p-1 rounded-xl overflow-hidden bg-gray-200 flex-[0.75]">
            <TouchableOpacity
              className={`flex-1 px-4 py-2 items-center justify-center rounded-xl ${
                activeTab === "1-day" ? "bg-white" : "bg-transparent"
              }`}
              onPress={() => setActiveTab("1-day")}
              disabled={!enableDate}
            >
              <Text className={`${activeTab === "1-day" ? "font-semibold" : ""} text-black`}>
                1 Day
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 px-4 py-2 items-center justify-center rounded-xl ${
                activeTab === "multi-day" ? "bg-white" : "bg-transparent"
              }`}
              onPress={() => setActiveTab("multi-day")}
              disabled={!enableDate}
            >
              <Text className={`${activeTab === "multi-day" ? "font-semibold" : ""} text-black`}>
                Multi-Day
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {enableDate && (
        <View className="mt-4">
          {activeTab === "1-day" ? (
            <View>
              <Text className="text-lg font-semibold mb-2">1-day</Text>
              <DateSelectSingleDay
                onChange={({ selectedDate }) => {
                  setValue("startDate", selectedDate, { shouldValidate: true });
                  setValue("endDate", selectedDate, { shouldValidate: true });

                  const startTime = new Date(selectedDate);
                  startTime.setHours(0, 0, 0, 0);
                  const endTime = new Date(selectedDate);
                  endTime.setHours(23, 59, 0, 0);

                  setValue("startTime", startTime, { shouldValidate: true });
                  setValue("endTime", endTime, { shouldValidate: true });
                }}
                defaultValue={startTime}
              />
            </View>
          ) : (
            <View>
              <Text className="text-lg font-semibold mb-2">Multi-day</Text>
              <DateSelectRangeDay />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default DateSection;
