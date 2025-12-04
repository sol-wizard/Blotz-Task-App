import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SubtaskCheckbox } from "@/feature/task-details/ui/custom-radio-checkbox";
import { theme } from "@/shared/constants/theme";
import { convertSubtaskTimeForm } from "../utils/convert-subtask-time-form";

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
};

export default function SubtaskItem({
  item: subtask,
  onToggle,
  color,
  isEditMode = false,
  onDelete,
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
    <View
      className="relative flex-row items-center py-2.5 px-3 mb-2"
      style={{
        backgroundColor: theme.colors.background,
        borderRadius: 10,
      }}
    >
      {isEditMode ? (
        <TouchableOpacity
          onPress={handleDelete}
          className="w-6 h-6 mr-4 items-center justify-center"
        >
          <MaterialIcons name="delete-outline" size={20} color={"#3D8DE0"} />
        </TouchableOpacity>
      ) : (
        <SubtaskCheckbox checked={isChecked} onPress={handleToggle} color={color} />
      )}

      <View className="text-sm min-w-[50px] px-2 py-1 rounded bg-blue-100 items-center justify-center">
        <Text className="text-sm font-baloo font-bold text-black">
          {subtask.duration ? convertSubtaskTimeForm(subtask.duration) : ""}
        </Text>
      </View>

      <Text
        className={`flex-1 text-[15px] font-baloo ml-3 ${isChecked ? "line-through" : ""}`}
        style={{ color: textColor }}
      >
        {subtask?.title}
      </Text>
    </View>
  );
}
