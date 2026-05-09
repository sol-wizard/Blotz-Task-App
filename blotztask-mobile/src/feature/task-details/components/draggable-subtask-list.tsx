import React, { useState, useEffect } from "react";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";
import { View, Platform } from "react-native";
import SubtaskItem from "@/feature/task-details/components/subtask-item";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DraggableSubtaskListProps = {
  subtasks: SubtaskDTO[];
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  onToggle?: (id: number) => void;
  color?: string;
  parentTaskId: number; 
  ListHeaderComponent?: React.ReactElement;
};
export const DraggableSubtaskList = ({
  subtasks,
  isEditMode = false,
  onDelete,
  onToggle,
  parentTaskId,
  ListHeaderComponent,
}: DraggableSubtaskListProps) => {
  const [data, setData] = useState(subtasks);
  const { bottom } = useSafeAreaInsets();
  const listBottomPadding = Platform.OS === "android" ? bottom + 12 : 0;

  useEffect(() => {
    setData(subtasks);
  }, [subtasks]);

  const renderItem = ({ item, drag }: RenderItemParams<SubtaskDTO>) => {
    return (
      <ScaleDecorator>
        <SubtaskItem
          item={item}
          onToggle={(id) => onToggle?.(id)}
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
        ListHeaderComponent={ListHeaderComponent}
        onDragEnd={({ data: newData }: { data: SubtaskDTO[] }) => setData(newData)}
        keyExtractor={(item: SubtaskDTO) => item.subTaskId.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: listBottomPadding }}
        autoscrollThreshold={40}
        autoscrollSpeed={100}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};
