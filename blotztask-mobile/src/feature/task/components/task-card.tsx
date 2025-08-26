import React, { useEffect, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { formatDateRange } from "../util/format-date-range";
import { CustomCheckbox } from "@/shared/components/ui/custom-checkbox";

interface TaskCardProps {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onPress?: () => void;
}

export default function TaskCard({
  id,
  title,
  startTime,
  endTime,
  isCompleted = false,
  onToggleComplete,
  onPress,
}: TaskCardProps) {
  const [checked, setChecked] = useState(isCompleted);

  useEffect(() => {
    setChecked(isCompleted);
  }, [isCompleted]);

  const handleToggleComplete = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    onToggleComplete?.(id, newChecked);
  };

  const timePeriod = formatDateRange({ startTime, endTime });

  return (
    <Pressable
      className="bg-white rounded-2xl mx-4 my-2 shadow-sm shadow-black/10 elevation-3"
      onPress={onPress}
    >
      <View className="flex-row items-center p-5">
        <CustomCheckbox checked={checked} onPress={handleToggleComplete} />

        <View className="w-[5px] h-[30px] bg-neutral-300 self-center mr-4 rounded-[2.5px]" />

        {/* Content */}
        <View className="flex-1 justify-start pt-0">
          <Text
            className={`text-base font-bold text-black -mt-0.5 mb-0 ${
              checked ? "text-neutral-400 line-through" : ""
            }`}
          >
            {title}
          </Text>
          {timePeriod && (
            <Text className="mt-1 text-[13px] text-neutral-400 font-semibold">
              {timePeriod}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
