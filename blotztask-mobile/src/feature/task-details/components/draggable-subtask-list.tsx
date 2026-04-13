import React, { useState, useEffect } from "react";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";
import { View } from "react-native";
import SubtaskItem from "@/feature/task-details/components/subtask-item";

type DraggableSubtaskListProps = {
  subtasks: SubtaskDTO[];
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  onToggle?: (id: number) => void;
  color?: string;
  parentTaskId: number; 
};
export const DraggableSubtaskList = ({
  subtasks,
  isEditMode = false,
  onDelete,
  onToggle,
  color,
  parentTaskId,
}: DraggableSubtaskListProps) => {
  const [data, setData] = useState(subtasks);

  useEffect(() => {
    setData(subtasks);
  }, [subtasks]);

  const renderItem = ({ item, drag }: RenderItemParams<SubtaskDTO>) => {
    return (
      <ScaleDecorator>
        <SubtaskItem
          item={{
            id: item.subTaskId,
            title: item.title,
            duration: item.duration,
            isDone: item.isDone,
            order: item.order,
          }}
          onToggle={(id) => onToggle?.(id)}
          color={color}
          isEditMode={isEditMode}
          onDelete={onDelete}
          drag={drag}
          parentTaskId={parentTaskId}
        />
      </ScaleDecorator>
    );
  };

  return (
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
  );
};
