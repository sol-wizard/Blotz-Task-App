import { Pressable, Text, View } from "react-native";
import { TaskThumbnailDTO } from "../models/monthly-task-indicator-dto";
import { theme } from "@/shared/constants/theme";

export type MonthlyDayProps = {
  date?: {
    dateString: string;
    day: number;
  };
  state?: "" | "selected" | "disabled" | "today" | "inactive";
  selectedDate?: string;
  tasks?: TaskThumbnailDTO[];
  onPressDay?: (dateString: string) => void;
};

export const MonthlyDay = ({
  date,
  state,
  selectedDate,
  tasks = [],
  onPressDay,
}: MonthlyDayProps) => {
  if (!date) return null;

  const dayKey = date.dateString;
  const isSelected = dayKey === selectedDate;
  const isToday = state === "today";
  const isInactive = state === "disabled" || state === "inactive";
  const previews = tasks.slice(0, 4);

  return (
    <View className="p-0.5 w-full">
      <Pressable
        onPress={() => onPressDay?.(dayKey)}
        className={`flex-col h-20 w-full items-center rounded-lg pt-1 border ${isSelected ? "" : "border-transparent"}`}
        style={isSelected ? { borderColor: theme.colors.secondary } : {}}
      >
        <View className={`w-6 h-6 rounded-full items-center justify-center mb-1`}>
          <Text
            className={`text-xs font-balooBold mt-0.5 ${isToday ? "text-highlight" : isInactive ? "text-gray-300" : "text-secondary"}`}
          >
            {date.day}
          </Text>
        </View>
        <View className="w-full px-1 gap-y-0.5">
          {previews.map((task, index) => {
            const labelColor = task.label?.color ?? theme.colors.disabled;
            const bgColor = `${labelColor}66`;

            return (
              <View
                key={`${dayKey}-${index}`}
                className="flex-row items-center rounded-sm px-0.5 h-3"
                style={{ backgroundColor: bgColor }}
              >
                <View
                  className="w-0.5 h-[70%] rounded-full mr-1"
                  style={{ backgroundColor: labelColor }}
                />
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    className={`text-[8px] font-bold font-inter leading-3 text-secondary`}
                  >
                    {task.taskTitle}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Pressable>
    </View>
  );
};
