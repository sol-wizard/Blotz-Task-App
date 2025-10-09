import { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";

export const TimePicker12H = ({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
}) => {
  const createTimeFromValues = (
    hour12: number | null,
    minute: number | null,
    isPM: boolean | null,
  ) => {
    if (hour12 === null || minute === null || isPM === null) {
      return null;
    }
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
      // Default to null values, but isPM defaults to false (AM)
      return { hour12: null, minute: null, isPM: false };
    }
  };

  const { hour12: initialHour12, minute: initialMinute, isPM: initialIsPM } = getCurrentTime();

  const [hour12, setHour12] = useState<number | null>(initialHour12);
  const [minute, setMinute] = useState<number | null>(initialMinute);
  const [isPM, setIsPM] = useState<boolean | null>(initialIsPM);

  // Sync internal state when value prop changes
  useEffect(() => {
    const { hour12: newHour12, minute: newMinute, isPM: newIsPM } = getCurrentTime();
    setHour12(newHour12);
    setMinute(newMinute);
    setIsPM(newIsPM);
  }, [value]);

  // Memoize hour and minute data
  const hourData = useMemo(
    () => [
      { value: null, label: "--" },
      ...[...Array(12).keys()].map((h) => ({
        value: h + 1, // 1-12
        label: String(h + 1).padStart(2, "0"),
      })),
    ],
    [],
  );

  const minData = useMemo(
    () => [
      { value: null, label: "--" },
      ...[...Array(60).keys()].map((m) => ({
        value: m,
        label: String(m).padStart(2, "0"),
      })),
    ],
    [],
  );

  // Update onChange only when values are not null and changed
  useEffect(() => {
    if (hour12 !== null && minute !== null && isPM !== null) {
      if (value) {
        const currentHour24 = value.getHours();
        const currentMinute = value.getMinutes();
        const currentIsPM = currentHour24 >= 12;

        let currentHour12 = currentHour24;
        if (currentHour24 === 0) {
          currentHour12 = 12;
        } else if (currentHour24 > 12) {
          currentHour12 = currentHour24 - 12;
        }

        if (currentHour12 !== hour12 || currentMinute !== minute || currentIsPM !== isPM) {
          const newTime = createTimeFromValues(hour12, minute, isPM);
          if (newTime) {
            onChange(newTime);
          }
        }
      } else {
        // If no value, just call onChange with current state
        const newTime = createTimeFromValues(hour12, minute, isPM);
        if (newTime) {
          onChange(newTime);
        }
      }
    }
  }, [hour12, minute, isPM]);

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
          value={hour12}
          onValueChanged={({ item: { value } }) => {
            setHour12(value);
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
          value={minute}
          onValueChanged={({ item: { value } }) => {
            setMinute(value);
          }}
        />
      </View>

      {/* AM/PM Toggle - Compact buttons */}
      <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
        <Pressable
          onPress={() => {
            setIsPM(false);
          }}
          className={`px-4 py-2 ${isPM === false ? "bg-blue-500" : "bg-transparent"}`}
        >
          <Text
            className={`font-balooBold text-sm ${isPM === false ? "text-white" : "text-gray-600"}`}
          >
            AM
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setIsPM(true);
          }}
          className={`px-4 py-2 ${isPM === true ? "bg-blue-500" : "bg-transparent"}`}
        >
          <Text
            className={`font-balooBold text-sm ${isPM === true ? "text-white" : "text-gray-600"}`}
          >
            PM
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
