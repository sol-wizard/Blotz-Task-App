import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { format, isToday, isTomorrow } from "date-fns";
import { View, Text } from "react-native";

const DateItem = ({ label, value }: { label: string; value?: string }) => {
  const formatDate = (val?: string) => {
    if (!val) return "-";

    const d = new Date(val);
    const time = format(d, "HH:mm");

    if (isToday(d)) return `Today ${time}`;
    if (isTomorrow(d)) return `Tomorrow ${time}`;

    return format(d, "MMM d H:mm");
  };

  return (
    <View className="flex-row items-center mr-10">
      <View className="w-10 h-10 rounded-full border-2 border-gray-500 border-dashed justify-center items-center mr-2">
        <MaterialIcons name="schedule" size={20} color="#6B7280" />
      </View>
      <View>
        <Text className="font-baloo">{label}</Text>
        <Text className="font-balooBold">{formatDate(value)}</Text>
      </View>
    </View>
  );
};

const TaskDateRange = ({ startTime, endTime }: { startTime?: string; endTime?: string }) => {
  const isSingleTime = !startTime || !endTime || startTime === endTime;

  if (isSingleTime) {
    const single = startTime ?? endTime;

    return (
      <View className="flex-row items-start mb-8">
        <DateItem label="Time" value={single} />
      </View>
    );
  }

  return (
    <View className="flex-row items-start mb-8">
      <DateItem label="Start from" value={startTime} />
      <DateItem label="End at" value={endTime} />
    </View>
  );
};

export default TaskDateRange;
