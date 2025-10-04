import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { Checkbox } from "react-native-paper";
import DateSelectSingleDay from "./date-select-single-day";
import DateSelectRangeDay from "./date-select-range-day";
import { TaskFormField } from "../../models/task-form-schema";
import { Control, UseFormSetValue } from "react-hook-form";
import { clearDateValues } from "../../task-form";

interface DateSectionProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  dateState: {
    enableDate: boolean;
    setEnableDate: React.Dispatch<React.SetStateAction<boolean>>;
  };
  activeTabState: {
    activeTab: "1-day" | "multi-day" | undefined;
    setActiveTab: React.Dispatch<React.SetStateAction<"1-day" | "multi-day" | undefined>>;
  };
  watchedValues: {
    formStartDate: Date | null;
  };
}

const DateSection = ({
  control,
  setValue,
  dateState,
  activeTabState,
  watchedValues,
}: DateSectionProps) => {
  const { enableDate, setEnableDate } = dateState;
  const { activeTab, setActiveTab } = activeTabState;
  const { formStartDate } = watchedValues;

  const handleDateToggle = () => {
    const newEnableDate = !enableDate;
    setEnableDate(newEnableDate);
    clearDateValues(setValue);

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
            <DateSelectSingleDay
              control={control}
              setValue={setValue}
              nameStart="startDate"
              nameEnd="endDate"
              startDate={formStartDate}
            />
          ) : (
            <DateSelectRangeDay
              control={control}
              setValue={setValue}
              nameStart="startDate"
              nameEnd="endDate"
            />
          )}
        </View>
      )}
    </View>
  );
};

export default DateSection;
