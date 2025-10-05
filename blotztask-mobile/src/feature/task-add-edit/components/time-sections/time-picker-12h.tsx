import { View, Text, Pressable } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";

export const TimePicker12H = ({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
}) => {
  const createTimeFromValues = (hour12: number, minute: number, isPM: boolean) => {
    const baseDate = value || new Date();
    const time = new Date(baseDate);
    
    let hour24 = hour12;
    if (isPM && hour12 !== 12) {
      hour24 = hour12 + 12;
    } else if (!isPM && hour12 === 12) {
      hour24 = 0;
    }
    
    time.setHours(hour24, minute, 0, 0);
    return time;
  };

  const getCurrentTime = () => {
    if (value) {
      const hour24 = value.getHours();
      const minute = value.getMinutes();
      const isPM = hour24 >= 12;
      
      let hour12 = hour24;
      if (hour24 === 0) {
        hour12 = 12;
      } else if (hour24 > 12) {
        hour12 = hour24 - 12;
      }
      
      return { hour12, minute, isPM };
    } else {
      // Default to 9:00 AM
      return { hour12: 9, minute: 0, isPM: false };
    }
  };

  const { hour12: currentHour12, minute: currentMinute, isPM: currentIsPM } = getCurrentTime();

  const hourData = [...Array(12).keys()].map((h) => ({
    value: h + 1, // 1-12
    label: String(h + 1).padStart(2, "0"),
  }));

  const minData = [...Array(60).keys()].map((m) => ({
    value: m,
    label: String(m).padStart(2, "0"),
  }));

  return (
    <View className="bg-gray-100 p-4 rounded-lg">
      <View className="flex-row justify-center items-center gap-2">
        {/* Hour Picker */}
        <View className="w-16 h-32 bg-white rounded-xl">
          <WheelPicker
            style={{ backgroundColor: "transparent" }}
            contentContainerStyle={{ backgroundColor: "transparent" }}
            overlayItemStyle={{ backgroundColor: "transparent" }}
            itemTextStyle={{ backgroundColor: "transparent", fontSize: 18 }}
            width={60}
            data={hourData}
            enableScrollByTapOnItem
            visibleItemCount={3}
            value={currentHour12}
            onValueChanged={({ item: { value } }) => {
              const time = createTimeFromValues(value, currentMinute, currentIsPM);
              onChange(time);
            }}
          />
        </View>

        <Text className="font-balooBold text-2xl text-gray-600">:</Text>

        {/* Minute Picker */}
        <View className="w-16 h-32 bg-white rounded-xl">
          <WheelPicker
            style={{ backgroundColor: "transparent" }}
            contentContainerStyle={{ backgroundColor: "transparent" }}
            overlayItemStyle={{ backgroundColor: "transparent" }}
            itemTextStyle={{ backgroundColor: "transparent", fontSize: 18 }}
            width={60}
            data={minData}
            enableScrollByTapOnItem
            visibleItemCount={3}
            value={currentMinute}
            onValueChanged={({ item: { value } }) => {
              const time = createTimeFromValues(currentHour12, value, currentIsPM);
              onChange(time);
            }}
          />
        </View>

        {/* AM/PM Toggle */}
        <View className="ml-4 bg-white rounded-lg overflow-hidden border border-gray-200">
          <Pressable
            onPress={() => {
              const time = createTimeFromValues(currentHour12, currentMinute, false);
              onChange(time);
            }}
            className={`px-3 py-2 ${
              !currentIsPM ? 'bg-blue-500' : 'bg-white'
            }`}
          >
            <Text className={`font-balooBold text-sm ${
              !currentIsPM ? 'text-white' : 'text-gray-600'
            }`}>
              AM
            </Text>
          </Pressable>
          <View className="h-px bg-gray-200" />
          <Pressable
            onPress={() => {
              const time = createTimeFromValues(currentHour12, currentMinute, true);
              onChange(time);
            }}
            className={`px-3 py-2 ${
              currentIsPM ? 'bg-blue-500' : 'bg-white'
            }`}
          >
            <Text className={`font-balooBold text-sm ${
              currentIsPM ? 'text-white' : 'text-gray-600'
            }`}>
              PM
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
