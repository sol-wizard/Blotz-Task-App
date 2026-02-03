import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import TasksCheckbox from "./task-checkbox";
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
        backgroundColor: "#FFFFFF",
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
        <TasksCheckbox checked={isChecked} onChange={() => handleToggle()} />
      )}
      <View className="flex-1 flex-row items-center justify-between ml-3">
        <Text
          className={`flex-1 text-[15px] font-baloo ${isChecked ? "line-through" : ""}`}
          style={{ color: textColor }}
        >
          {subtask?.title}
        </Text>

        {subtask.duration && (
          <Text className="text-sm font-baloo font-bold text-black ml-2">
            {subtask.duration ? convertDurationToText(subtask.duration) : ""}
          </Text>
        )}
      </View>
    </View>
  );
}
