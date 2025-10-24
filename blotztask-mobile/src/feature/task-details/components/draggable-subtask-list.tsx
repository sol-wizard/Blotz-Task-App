import React, { useState } from "react";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";
import { Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

type DraggableSubtaskListProps = {
  subtasks: SubtaskDTO[];
}
export const DraggableSubtaskList = ({subtasks}: DraggableSubtaskListProps) => {
  const [data, setData] = useState(subtasks);

  const renderItem = ({item, drag, isActive}: RenderItemParams<SubtaskDTO>) => {
    return (
      <TouchableOpacity
        style={[
          { opacity: isActive ? 0.8 : 1.0 },
        ]}
        onLongPress={drag} // <--- Key for starting the drag gesture
        disabled={isActive}
      >
        <Text>{item.title}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View>
        <DraggableFlatList
          data={data}
          onDragEnd={({ data: newData }: { data: SubtaskDTO[] }) => setData(newData)}// <--- Key for updating data
          keyExtractor={(item: SubtaskDTO) => item.subTaskId.toString()}
          renderItem={renderItem}
          autoscrollThreshold={40}
          autoscrollSpeed={100}
        />
      </View>
    </GestureHandlerRootView>
  );
}