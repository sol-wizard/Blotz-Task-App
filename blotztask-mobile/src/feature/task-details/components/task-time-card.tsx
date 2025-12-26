import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { formatTaskTime } from "../utils/format-task-time";

export const TaskSingleTimeCard = ({ startTime }: { startTime: string }) => {
  const time = formatTaskTime(startTime);
  return (
    <View className="flex-row items-center py-3">
      <MaterialIcons name="schedule" size={20} color="#4B5063" />
      <Text className="ml-2 text-primary font-balooThin">Time</Text>
      <Text className="ml-2 text-secondary font-baloo text-lg">{time}</Text>
    </View>
  );
};

export const TaskRangeTimeCard = ({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}) => {
  const formattedStartTime = formatTaskTime(startTime);
  const formattedEndTime = formatTaskTime(endTime);

  return (
    <View className="flex-row items-center py-3">
      <MaterialCommunityIcons name="calendar-range-outline" size={20} color="#4B5063" />
      <Text className="ml-2 text-primary font-balooThin">Start from</Text>
      <Text className="ml-2 text-secondary font-baloo text-lg">{formattedStartTime}</Text>
      <Text className="ml-4 text-primary font-balooThin">End at</Text>
      <Text className="ml-2 text-secondary font-baloo text-lg">{formattedEndTime}</Text>
    </View>
  );
};
