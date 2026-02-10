import React, { useState, useEffect } from "react";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";
import { View, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import SubtaskItem from "@/feature/task-details/components/subtask-item";

type DraggableSubtaskListProps = {
  subtasks: SubtaskDTO[];
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  onToggle?: (id: number) => void;
  color?: string;
};
export const DraggableSubtaskList = ({
  subtasks,
  isEditMode = false,
  onDelete,
  onToggle,
  color,
}: DraggableSubtaskListProps) => {
  const [data, setData] = useState(subtasks);

  useEffect(() => {
    setData(subtasks);
  }, [subtasks]);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<SubtaskDTO>) => {
    return (
      <TouchableOpacity
        style={[{ opacity: isActive ? 0.8 : 1.0 }]}
        onLongPress={isEditMode ? drag : undefined}
        disabled={isActive || !isEditMode}
        activeOpacity={1}
      >
        <SubtaskItem
          item={{
            id: item.subTaskId,
            title: item.title,
            duration: item.duration,
            isDone: item.isDone,
          }}
          onToggle={(id) => onToggle?.(id)}
          color={color}
          isEditMode={isEditMode}
          onDelete={onDelete}
        />
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView>
      <View className="flex-1">
        <DraggableFlatList
          data={data}
          onDragEnd={({ data: newData }: { data: SubtaskDTO[] }) => setData(newData)}
          keyExtractor={(item: SubtaskDTO) => item.subTaskId.toString()}
          renderItem={renderItem}
          autoscrollThreshold={40}
          autoscrollSpeed={100}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </GestureHandlerRootView>
  );
};
