import { View } from "react-native";
import { Text } from "react-native-paper";
import { CustomCheckbox } from "@/shared/components/ui/custom-checkbox";
import { COLORS } from "@/shared/constants/colors";
import { convertSubtaskTimeForm } from "@/feature/breakdown/utils/convert-subtask-time-form";

const COLOR = COLORS.primary;

type SubtaskItemProps = {
  item: any;
  onToggle: (id: number) => void;
};

export default function SubtaskItem({ item: s, onToggle }: SubtaskItemProps) {
  return (
    <View className="relative flex-row items-start py-4">
      {/* Checkbox */}
      <CustomCheckbox checked={!!s?.isDone} onPress={() => onToggle(s.id)} />

      {/* Right column: Title/Duration/Description */}
      <View className="flex-1 ml-2">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-[15px] ${s?.isDone ? "line-through" : ""}`}
            style={{ fontWeight: "800", color: s?.isDone ? COLOR : undefined }}
          >
            {s?.title ?? "Subtask"}
          </Text>
          <Text className="ml-3 text-sm" style={{ color: COLOR, fontWeight: "800" }}>
            {convertSubtaskTimeForm(s?.duration)}
          </Text>
        </View>

        <Text
          className={`mt-1 text-[13px] font-semibold ${s?.isDone ? "line-through" : ""}`}
          style={{ color: COLOR }}
        >
          {s?.description ?? " "}
        </Text>
      </View>
    </View>
  );
}
