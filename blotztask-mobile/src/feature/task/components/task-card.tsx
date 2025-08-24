import React, { useEffect, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { format } from "date-fns";

interface TaskCardProps {
  id: string;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
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

  const formatDateRange = () => {
    const formatToken = "dd/MM/yyyy";
    const hasStartTime = startTime && startTime !== null;
    const hasEndTime = endTime && endTime !== null;
    
    if (hasStartTime && hasEndTime) {
      return `${format(new Date(startTime), formatToken)} - ${format(new Date(endTime), formatToken)}`;
    } else if (hasStartTime && !hasEndTime) {
      return `${format(new Date(startTime), formatToken)} - ?`;
    } else if (!hasStartTime && hasEndTime) {
      return `? - ${format(new Date(endTime), formatToken)}`;
    } else {
      return "";
    }
  };

  return (
    <Pressable 
      className="bg-white rounded-2xl mx-4 my-2 shadow-sm shadow-black/10 elevation-3" 
      onPress={onPress}
    >
      <View className="flex-row items-center p-5">
        {/* Custom Checkbox */}
        <Pressable
          className={`w-8 h-8 rounded-[10px] border-[3px] mr-3 items-center justify-center ${
            checked 
              ? 'bg-neutral-300 border-neutral-300' 
              : 'bg-white border-gray-300'
          }`}
          onPress={handleToggleComplete}
        >
          {checked && <View className="w-3 h-3 bg-white rounded-sm" />}
        </Pressable>

        {/* Gray Vertical Line */}
        <View className="w-[5px] h-[30px] bg-neutral-300 self-center mr-4 rounded-[2.5px]" />

        {/* Content */}
        <View className="flex-1 justify-start pt-0">
          <Text 
            className={`text-base font-bold text-black -mt-0.5 mb-0 ${
              checked ? 'text-neutral-400 line-through' : ''
            }`}
          >
            {title}
          </Text>
          {formatDateRange() && (
            <Text className="mt-1 text-[13px] text-neutral-400 font-semibold">
              {formatDateRange()}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
