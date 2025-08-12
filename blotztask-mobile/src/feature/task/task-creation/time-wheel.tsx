import { View, Text, Pressable } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";
import { useEffect, useState } from "react";

export const TimeWheel = ({
  onChange,
}: {
  onChange: (timeISO: string) => void;
}) => {
  const [selected, setSelected] = useState<"AM" | "PM">("AM");
  const [hourValue, setHourValue] = useState(0);
  const [minValue, setMinValue] = useState(0);

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

  const getTimeISO = () => {
    let h = hourValue;
    if (selected === "PM" && h !== 12) h += 12;
    if (selected === "AM" && h === 12) h = 0;
    const hh = String(h).padStart(2, "0");
    const mm = String(minValue).padStart(2, "0");
    return `${hh}:${mm}:00`;
  };

  useEffect(() => {
    onChange(getTimeISO());
  }, [selected, hourValue, minValue]);

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
          value={hourValue}
          onValueChanged={({ item: { value } }) => setHourValue(value)}
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
          value={minValue}
          onValueChanged={({ item: { value } }) => setMinValue(value)}
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
