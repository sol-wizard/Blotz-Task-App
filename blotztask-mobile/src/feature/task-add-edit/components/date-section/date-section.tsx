import { View, Text, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { Checkbox } from "react-native-paper";
import DateSelectSingleDay from "./date-select-single-day";

const DateSection = () => {
  const [activeTab, setActiveTab] = useState<"1-day" | "multi-day">("1-day");
  const [checked, setChecked] = useState(true);

  return (
    <View className="flex-col gap-4 mb-8">
      <View className="flex-row items-center justify-between">
        {/* Date Label */}
        <View className="flex-row gap-2 items-center ">
          <View className="bg-blue-100 rounded-lg" style={{ transform: [{ scale: 0.7 }] }}>
            <Checkbox
              status={checked ? "checked" : "unchecked"}
              onPress={() => setChecked(!checked)}
              color="#B0D0FA"
            />
          </View>
          <Text className="font-balooBold text-3xl leading-normal">Date</Text>
        </View>

        {/* Segmented Control */}
        <View className="flex-row items-stretch p-1 rounded-xl overflow-hidden bg-gray-200 flex-[0.75]">
          <TouchableOpacity
            className={`flex-1 px-4 py-2 items-center justify-center rounded-xl ${
              activeTab === "1-day" ? "bg-white" : "bg-transparent"
            }`}
            onPress={() => setActiveTab("1-day")}
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
          >
            <Text className={`${activeTab === "multi-day" ? "font-semibold" : ""} text-black`}>
              Multi-Day
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View className="mt-4">
        {activeTab === "1-day" ? (
          <View>
            <Text className="text-lg font-semibold mb-2">1-day</Text>
            <DateSelectSingleDay />
          </View>
        ) : (
          <View>
            <Text className="text-lg font-semibold mb-2">Multi-day</Text>
            <Text>Content for Multi-day view</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default DateSection;
