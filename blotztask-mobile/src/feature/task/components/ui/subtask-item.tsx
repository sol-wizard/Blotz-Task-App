import { View, Text } from "react-native";
import { CustomCheckbox } from "@/shared/components/ui/custom-checkbox";
import { convertSubtaskTimeForm } from "@/feature/breakdown/utils/convert-subtask-time-form";

type SubtaskItemProps = {
  item: any;
  onToggle: (id: number) => void;
};

export default function SubtaskItem({ item: s, onToggle }: SubtaskItemProps) {
  return (
    <View className="relative flex-row items-start py-4">
      <CustomCheckbox checked={!!s?.isDone} onPress={() => onToggle(s.id)} />

      <View className="flex-1 ml-2">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-[15px] font-baloo ${s?.isDone ? "line-through text-tertiary" : undefined}`}
          >
            {s?.title}
          </Text>
          <Text className="ml-3 text-sm font-baloo text-tertiary">
            {convertSubtaskTimeForm(s?.duration)}
          </Text>
        </View>

        <Text
          className={`mt-1 text-[13px] font-semibold text-tertiary ${s?.isDone ? "line-through" : ""}`}
        >
          {s?.description ?? " "}
        </Text>
      </View>
    </View>
  );
}
