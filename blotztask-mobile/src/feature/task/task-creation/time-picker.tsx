import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { TimeModeSegment } from "./time-mode-segment";
import { TimeWheel } from "./time-wheel";

type Mode = "allDay" | "time" | "range";

export default function TimePicker({
  timeSelected,
  setTimeSelected,
}: {
  timeSelected: string;
  setTimeSelected: (time: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("time");

  return (
    <View className="p-4">
      <Text className="text-lg text-gray-800 mb-3">Select time:</Text>

      <View className="flex-row bg-gray-100 rounded-full mb-4 h-10">
        <TimeModeSegment
          label="All day"
          active={mode === "allDay"}
          onPress={() => setMode("allDay")}
        />
        <TimeModeSegment
          label="Time"
          active={mode === "time"}
          onPress={() => setMode("time")}
        />
        <TimeModeSegment
          label="Range"
          active={mode === "range"}
          onPress={() => setMode("range")}
        />
      </View>

      {mode === "allDay" && (
        <View className="bg-white rounded-xl border border-gray-200 p-4">
          <Text className="text-gray-800">All-day event</Text>
          <Text className="text-gray-500 mt-1 text-sm">
            The task lasts for the whole day.
          </Text>
        </View>
      )}

      {mode === "time" && (
        <View className="bg-white rounded-xl border-gray-200 flex-row justify-between">
          <View className="flex-col">
            <Text className="mb-2 text-lg text-gray-800">Start</Text>
            <TimeWheel />
          </View>
          <View className="flex-col">
            <Text className="mb-2 text-lg text-gray-800">End</Text>
            <TimeWheel />
          </View>
        </View>
      )}

      {mode === "range" && (
        <View className="bg-white rounded-xl border border-gray-200 p-4">
          <Text className="text-gray-500 mt-1 text-sm">
            Pick a time period.
          </Text>
        </View>
      )}
    </View>
  );
}
