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
    <View className="flex-row items-center gap-4">
      {/* Time Picker - Compact like existing design */}
      <View className="w-32 h-10 bg-white flex-row justify-center items-center rounded-xl">
        <WheelPicker
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={{ backgroundColor: "transparent" }}
          overlayItemStyle={{ backgroundColor: "transparent" }}
          itemTextStyle={{ backgroundColor: "transparent", fontSize: 18 }}
          width={60}
          data={hourData}
          enableScrollByTapOnItem
          visibleItemCount={1}
          value={currentHour12}
          onValueChanged={({ item: { value } }) => {
            const time = createTimeFromValues(value, currentMinute, currentIsPM);
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
            const time = createTimeFromValues(currentHour12, value, currentIsPM);
            onChange(time);
          }}
        />
      </View>

      {/* AM/PM Toggle - Compact buttons */}
      <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
        <Pressable
          onPress={() => {
            const time = createTimeFromValues(currentHour12, currentMinute, false);
            onChange(time);
          }}
          className={`px-4 py-2 ${
            !currentIsPM ? 'bg-blue-500' : 'bg-transparent'
          }`}
        >
          <Text className={`font-balooBold text-sm ${
            !currentIsPM ? 'text-white' : 'text-gray-600'
          }`}>
            AM
          </Text>
        </Pressable>
        
        <Pressable
          onPress={() => {
            const time = createTimeFromValues(currentHour12, currentMinute, true);
            onChange(time);
          }}
          className={`px-4 py-2 ${
            currentIsPM ? 'bg-blue-500' : 'bg-transparent'
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
  );
};
