import { View, Text } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";

export const TimePicker = ({
  defaultValue,
  onChange,
}: {
  defaultValue: Date | undefined;
  onChange: (d: Date) => void;
}) => {
  const currentHour = defaultValue?.getHours() || 0;
  const currentMinute = defaultValue?.getMinutes() || 0;

  const hourData = [...Array(24).keys()].map((h) => ({
    value: h,
    label: String(h).padStart(2, "0"),
  }));

  const minData = [...Array(60).keys()].map((m) => ({
    value: m,
    label: String(m).padStart(2, "0"),
  }));

  const createTimeFromValues = (hour: number, minute: number) => {
    const baseDate = defaultValue || new Date();
    const mergedTime = new Date(baseDate);
    mergedTime.setHours(hour, minute, 0, 0);
    onChange(mergedTime);
  };

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
          value={currentHour}
          onValueChanged={({ item: { value } }) => {
            createTimeFromValues(value, currentMinute);
          }}
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
          value={currentMinute}
          onValueChanged={({ item: { value } }) => {
            createTimeFromValues(currentHour, value);
          }}
        />
      </View>
    </View>
  );
};
