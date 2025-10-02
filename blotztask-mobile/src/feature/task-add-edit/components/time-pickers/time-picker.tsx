import { View, Text } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";

export const TimePicker = ({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
}) => {
  const createTimeFromValues = (hour: number, minute: number) => {
    const baseDate = value || new Date();
    const time = new Date(baseDate);
    time.setHours(hour, minute, 0, 0);
    return time;
  };

  const getCurrentTime = () => {
    if (value) {
      return {
        hour: value.getHours(),
        minute: value.getMinutes(),
      };
    } else {
      // Always show 00:00 initially when value is null
      return { hour: 0, minute: 0 };
    }
  };

  const { hour: currentHour, minute: currentMinute } = getCurrentTime();

  const hourData = [...Array(24).keys()].map((h) => ({
    value: h,
    label: String(h).padStart(2, "0"),
  }));

  const minData = [...Array(60).keys()].map((m) => ({
    value: m,
    label: String(m).padStart(2, "0"),
  }));

  return (
    <View className="flex-row border rounded-xl border-gray-200">
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
            const time = createTimeFromValues(value, currentMinute);
            onChange(time);
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
            const time = createTimeFromValues(currentHour, value);
            onChange(time);
          }}
        />
      </View>
    </View>
  );
};
