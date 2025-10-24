import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { SubtaskCheckbox } from "@/feature/task-details/ui/custom-radio-checkbox";
import { theme } from "@/shared/constants/theme";
import { convertSubtaskTimeForm } from "../utils/convert-subtask-time-form";

type SubtaskItemProps = {
  item: any;
  onToggle: (id: number) => void;
  color?: string;
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
};

export default function SubtaskItem({
  item: s,
  onToggle,
  color,
  isEditMode = false,
  onDelete,
}: SubtaskItemProps) {
  const [isChecked, setIsChecked] = useState(s?.isDone);

  const handleToggle = () => {
    setIsChecked(!isChecked);
    onToggle(s.id);
  };

  const handleDelete = () => {
    onDelete?.(s.id);
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

      <View
        className="text-sm min-w-[50px] px-2 py-1 rounded bg-blue-100 items-center justify-center"
      >
        <Text
          className="text-sm font-baloo font-bold" 
          style={{
            color: theme.colors.heading, 
          }}
        >
          {convertSubtaskTimeForm(s?.duration)}
        </Text>
      </View>

      <Text
        className={`flex-1 text-[15px] font-baloo ml-3 ${isChecked ? "line-through" : ""}`}
        style={{ color: textColor }}
      >
        {s?.title}
      </Text>
    </View>
  );
}
