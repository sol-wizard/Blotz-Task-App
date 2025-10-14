import { View, Text } from "react-native";
import { CustomRadioCheckbox } from "@/shared/components/ui/custom-radio-checkbox";
import { convertSubtaskTimeForm } from "@/feature/breakdown/utils/convert-subtask-time-form";
import { theme } from "@/shared/constants/theme";

type SubtaskItemProps = {
  item: any;
  onToggle: (id: number) => void;
  color?: string;
};

export default function SubtaskItem({ item: s, onToggle, color }: SubtaskItemProps) {
  return (
    <View className="relative flex-row items-center py-2.5">
      <CustomRadioCheckbox checked={!!s?.isDone} onPress={() => onToggle(s.id)} color={color} />
      
      <Text
        className="text-sm min-w-[50px]"
        style={{ 
          color: theme.colors.heading,
          fontWeight: "600"
        }}
      >
        {convertSubtaskTimeForm(s?.duration)}
      </Text>

      <Text
        className={`flex-1 text-[15px] font-baloo ml-3 ${
          s?.isDone ? "line-through" : ""
        }`}
        style={{ color: s?.isDone ? theme.colors.disabled : theme.colors.tertiary }}
      >
        {s?.title}
      </Text>
    </View>
  );
}
