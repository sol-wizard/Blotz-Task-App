import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { View, Text } from "react-native";

const DateItem = ({ label, value }: { label: string; value?: string }) => {
  const formatDate = (val?: string) => (val ? format(new Date(val), "dd/MM/yyyy hh:mm a") : "-");
  return (
    <View className="flex-row items-center mr-14">
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
  return (
    <View className="flex-row items-start mb-8">
      <DateItem label="Start from" value={startTime} />
      <DateItem label="End at" value={endTime} />
    </View>
  );
};

export default TaskDateRange;
