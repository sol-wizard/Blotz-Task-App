import { View, Text, TouchableOpacity } from "react-native";
import { CustomRadioCheckbox } from "@/shared/components/ui/custom-radio-checkbox";
import { convertSubtaskTimeForm } from "@/feature/breakdown/utils/convert-subtask-time-form";
import { theme } from "@/shared/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";

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
  return (
    <View className="relative flex-row items-center py-2.5">
      {isEditMode ? (
        <TouchableOpacity
          onPress={() => onDelete?.(s.id)}
          className="w-6 h-6 mr-4 items-center justify-center"
        >
          <MaterialIcons name="close" size={24} color={theme.colors.heading} />
        </TouchableOpacity>
      ) : (
        <CustomRadioCheckbox checked={!!s?.isDone} onPress={() => onToggle(s.id)} color={color} />
      )}

      <Text
        className="text-sm min-w-[50px]"
        style={{
          color: theme.colors.heading,
          fontWeight: "600",
        }}
      >
        {convertSubtaskTimeForm(s?.duration)}
      </Text>

      <Text
        className={`flex-1 text-[15px] font-baloo ml-3 ${s?.isDone ? "line-through" : ""}`}
        style={{ color: s?.isDone ? theme.colors.disabled : theme.colors.tertiary }}
      >
        {s?.title}
      </Text>
    </View>
  );
}
