import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { TaskCheckbox } from "@/shared/components/ui/task-checkbox";
import { theme } from "@/shared/constants/theme";
import { convertDurationToText } from "../../../shared/util/convert-duration";

type SubtaskItemData = {
  id: number;
  title: string;
  duration?: string;
  isDone: boolean;
};

type SubtaskItemProps = {
  item: SubtaskItemData;
  onToggle: (id: number) => void;
  color?: string;
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  isWarmup?: boolean;
};

export default function SubtaskItem({
  item: subtask,
  onToggle,
  color,
  isEditMode = false,
  onDelete,
  isWarmup = false,
}: SubtaskItemProps) {
  const isChecked = subtask?.isDone;
  const handleToggle = () => {
    onToggle(subtask.id);
  };

  const handleDelete = () => {
    onDelete?.(subtask.id);
  };

  const textColor = isChecked ? theme.colors.disabled : theme.colors.onSurface;

  return (
    <View className="relative w-full flex-row items-start justify-between py-2.5 px-3 mb-2">
      {isEditMode ? (
        <TouchableOpacity
          onPress={handleDelete}
          className="w-6 h-6 mr-4 items-center justify-center"
        >
          <MaterialIcons name="delete-outline" size={20} color={"#3D8DE0"} />
        </TouchableOpacity>
      ) : isWarmup ? null : (
        <TaskCheckbox
          checked={isChecked}
          onPress={handleToggle}
          disabled={false}
          haptic={true}
          size={28}
        />
      )}
      <View className="flex-1 min-w-0 ml-3">
        {isWarmup ? (
          <View className="self-start rounded-full bg-orange-100 px-3 py-1 mb-1">
            <Text className="text-orange-500 font-baloo text-sm">Warmup</Text>
          </View>
        ) : null}

        <Text
          className={`text-[15px] font-baloo ml-3 ${isChecked ? "line-through" : ""}`}
          style={{ color: textColor }}
        >
          {subtask?.title}
        </Text>
      </View>

      <View className="text-sm w-[60px] items-end ml-2">
        <Text className="text-right font-baloo font-bold text-black">
          {subtask.duration ? convertDurationToText(subtask.duration) : ""}
        </Text>
      </View>
    </View>
  );
}
