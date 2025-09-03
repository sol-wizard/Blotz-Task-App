import { View, Text } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";
import { useEffect, useState } from "react";

export const TimeWheel = ({
  defaultValue,
  onChange,
}: {
  defaultValue: Date;
  onChange: (timeISO: string) => void;
}) => {
  const initialHour = defaultValue ? defaultValue.getHours() : 0;
  const initialMinute = defaultValue ? defaultValue.getMinutes() : 0;
  const [hourValue, setHourValue] = useState(initialHour);
  const [minValue, setMinValue] = useState(initialMinute);

  const hourData = [...Array(24).keys()].map((h) => ({
    value: h,
    label: String(h).padStart(2, "0"),
  }));

  const minData = [...Array(60).keys()].map((m) => ({
    value: m,
    label: String(m).padStart(2, "0"),
  }));

  const getTime = () => {
    const hh = String(hourValue).padStart(2, "0");
    const mm = String(minValue).padStart(2, "0");
    return `${hh}:${mm}:00`;
  };

  useEffect(() => {
    onChange(getTime());
  }, [hourValue, minValue]);

  return (
    <View className="flex-row mb-4 border rounded-xl border-gray-200">
      <View className="w-32 h-10 bg-white flex-row justify-center items-center m-2">
        <WheelPicker
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={{ backgroundColor: "transparent" }}
          overlayItemStyle={{ backgroundColor: "transparent" }}
          itemTextStyle={{ backgroundColor: "transparent", fontSize: 18 }}
          width={60}
          data={hourData}
          enableScrollByTapOnItem
          visibleItemCount={1}
          value={hourValue}
          onValueChanged={({ item: { value } }) => setHourValue(value)}
        />

        <Text className="font-bold text-2xl text-gray-600">:</Text>

        <WheelPicker
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={{ backgroundColor: "transparent" }}
          overlayItemStyle={{ backgroundColor: "transparent" }}
          itemTextStyle={{ backgroundColor: "transparent", fontSize: 18 }}
          width={60}
          data={minData}
          enableScrollByTapOnItem
          visibleItemCount={1}
          value={minValue}
          onValueChanged={({ item: { value } }) => setMinValue(value)}
        />
      </View>
    </View>
  );
};
