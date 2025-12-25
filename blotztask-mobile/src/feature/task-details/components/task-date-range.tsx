import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { format, isToday, isTomorrow, isSameDay, isAfter, startOfDay } from "date-fns";
import { View, Text } from "react-native";

const DateItem = ({
  label,
  value,
  isStart,
}: {
  label: string;
  value?: string;
  isStart?: boolean;
}) => {
  if (!value) return null;
  const date = new Date(value);

  const today = new Date();
  const isFutureDate = !isSameDay(date, today) && isAfter(startOfDay(date), startOfDay(today));
  const iconName = isStart && isFutureDate ? "date-range" : "schedule";

  const formatDate = (val: string) => {
    const time = format(date, "HH:mm");

    if (isToday(date)) return `Today ${time}`;
    if (isTomorrow(date)) return `Tomorrow ${time}`;

    return format(date, "MMM d H:mm");
  };

  return (
    <View className="flex-row items-center mr-10">
      {isStart && (
        <View className="justify-center items-center mr-2">
          <MaterialIcons name={iconName} size={30} color="#6B7280" />
        </View>
      )}

      <View>
        <Text className="font-baloo">{label}</Text>
        <Text className="font-balooBold">{formatDate(value)}</Text>
      </View>
    </View>
  );
};

const TaskDateRange = ({ startTime, endTime }: { startTime?: string; endTime?: string }) => {
  if (!startTime && !endTime) return null;
  const isSingleTime = !!startTime && !!endTime && startTime === endTime;
  if (isSingleTime) {
    return (
      <View className="flex-row items-start mb-8">
        <DateItem label="Time" value={startTime} isStart />
      </View>
    );
  }

  return (
    <View className="flex-row items-start mb-8">
      <DateItem label="Start from" value={startTime} isStart={true} />
      <DateItem label="End at" value={endTime} isStart={false} />
    </View>
  );
};

export default TaskDateRange;
