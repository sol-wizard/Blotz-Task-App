import { Pressable, Text, View } from "react-native";
import { Hanging } from "../common/hanging";
import { TaskStatusType } from "@/feature/calendar/modals/task-status-type";

export const TaskStatusButton = ({
  isSelected,
  onChange,
  statusName,
  taskCount,
}: {
  isSelected: boolean;
  onChange: (v: TaskStatusType) => void;
  statusName: TaskStatusType;
  taskCount: number;
}) => {
  return (
    <Hanging active={isSelected}>
      <Pressable
        onPress={() => onChange(statusName)}
        className={`flex-row items-center gap-2 px-4 py-2 rounded-xl border ${
          isSelected ? "bg-black" : "bg-white border-gray-300"
        }`}
      >
        <Text className={`text-sm ${isSelected ? "text-white font-extrabold" : "text-gray-700"}`}>
          {statusName}
        </Text>
        <View className={`px-2 py-0.5 rounded-full ${isSelected ? "bg-white" : "bg-gray-400"}`}>
          <Text
            className={`text-xs font-semibold ${isSelected ? "text-black font-bold" : "text-white"}`}
          >
            {taskCount}
          </Text>
        </View>
      </Pressable>
    </Hanging>
  );
};
