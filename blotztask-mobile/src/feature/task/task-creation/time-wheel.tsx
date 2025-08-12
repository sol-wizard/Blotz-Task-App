import { View, Text, Pressable } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";
import { Button } from "react-native-paper";
import { useState } from "react";

export const TimeWheel = () => {
  const [selected, setSelected] = useState<"AM" | "PM">("AM");
  const hourData = [...Array(12).keys()].map((index) => {
    const value = index + 1;
    return {
      value,
      label: value.toString().padStart(2, "0"),
    };
  });

  const minData = [...Array(60).keys()].map((index) => ({
    value: index,
    label: index.toString().padStart(2, "0"),
  }));
  return (
    <View className="flex-row mb-4 border rounded-3xl border-gray-200">
      <View className="w-24 bg-white flex-row justify-center m-2 p-2">
        <WheelPicker
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={{ backgroundColor: "transparent" }}
          overlayItemStyle={{ backgroundColor: "transparent" }}
          itemTextStyle={{ backgroundColor: "transparent", fontSize: 18 }}
          width={50}
          data={hourData}
          enableScrollByTapOnItem={true}
          visibleItemCount={1}
        />
        <Text className="text-center font-bold text-2xl text-gray-600 mt-2 ">
          :
        </Text>
        <WheelPicker
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={{ backgroundColor: "transparent" }}
          overlayItemStyle={{ backgroundColor: "transparent" }}
          itemTextStyle={{ backgroundColor: "transparent", fontSize: 18 }}
          width={50}
          data={minData}
          enableScrollByTapOnItem={true}
          visibleItemCount={1}
        />
      </View>

      <View className="flex-col border-l border-gray-200 items-center justify-between">
        <Pressable
          onPress={() => setSelected("AM")}
          className={`w-16 py-2 rounded-md items-center ${
            selected === "AM" ? "bg-black" : "bg-white"
          }`}
        >
          <Text
            className={`text-lg ${
              selected === "AM" ? "text-white" : "text-black"
            }`}
          >
            AM
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSelected("PM")}
          className={`w-16 py-2 rounded-md items-center ${
            selected === "PM" ? "bg-black" : "bg-white"
          }`}
        >
          <Text
            className={`text-lg ${
              selected === "PM" ? "text-white" : "text-black"
            }`}
          >
            PM
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
