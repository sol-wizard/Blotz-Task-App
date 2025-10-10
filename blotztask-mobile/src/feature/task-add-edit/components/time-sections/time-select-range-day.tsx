import { View, Text } from "react-native";
import React, { useState } from "react";
import { RadioButton } from "react-native-paper";
import { TimePicker } from "../time-pickers/time-picker";

const TimeSelectRangeDay = () => {
  const [selected, setSelected] = useState("");
  return (
    <View>
      <RadioButton.Group
        onValueChange={(value) => {
          setSelected(value);
        }}
        value={selected}
      >
        <View className="flex-col justify-start gap-2">
          {["All Day", "Time Range"].map((option) => (
            <View key={option} className="flex-row items-center gap-2">
              <View
                className={`rounded-full p-1 flex justify-center items-center ${
                  selected === option ? "bg-blue-100" : "bg-white"
                }`}
                style={{ transform: [{ scale: 0.5 }] }}
              >
                <RadioButton value={option} color="#B0D0FA" />
              </View>
              <Text className="text-lg">{option}</Text>
            </View>
          ))}
        </View>
      </RadioButton.Group>
      <View className="flex-col gap-2 items-start justify-center">
        <View className="flex-row gap-2 items-center">
          <Text>Start Time</Text>
          <TimePicker value={null} onChange={() => {}} />
        </View>

        <View className="flex-row gap-2 items-center">
          <Text>End Time</Text>
          <TimePicker value={null} onChange={() => {}} />
        </View>
      </View>
    </View>
  );
};

export default TimeSelectRangeDay;
