import { Pressable, Text, View } from "react-native";
import { Hanging } from "../common/hanging";

export const TaskStatusButton = ({
  isSelected,
  onChange,
  statusName,
  taskCount,
}: {
  isSelected: boolean;
  onChange: () => void;
  statusName: string;
  taskCount: number;
}) => {
  return (
    <Hanging active={isSelected}>
      <Pressable
        onPress={onChange}
        className={`flex-row items-center gap-2 px-4 py-2 rounded-xl border ${
          isSelected ? "bg-black" : "bg-white border-gray-300"
        }`}
      >
        <Text
          className={`${isSelected ? "text-white font-balooBold" : "text-gray-700 font-balooThin"}`}
        >
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
