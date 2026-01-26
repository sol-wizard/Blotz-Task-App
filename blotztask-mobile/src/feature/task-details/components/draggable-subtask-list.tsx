import React, { useMemo, useState, useEffect, useCallback } from "react";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import SubtaskItem from "@/feature/task-details/components/subtask-item";
import Sortable from "react-native-sortables";
import Animated, { useAnimatedRef } from "react-native-reanimated";

type DraggableSubtaskListProps = {
  subtasks: SubtaskDTO[];
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  onToggle?: (id: number) => void;
  color?: string;
  onReorder?: (subtasks: SubtaskDTO[]) => void | Promise<void>;
};
export const DraggableSubtaskList = ({
  subtasks,
  isEditMode = false,
  onDelete,
  onToggle,
  color,
  onReorder,
}: DraggableSubtaskListProps) => {
  const [data, setData] = useState<SubtaskDTO[]>(subtasks);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  useEffect(() => {
    setData([...subtasks].sort((a, b) => a.order - b.order));
  }, [subtasks]);

  const orderBase = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((minOrder, subtask) => Math.min(minOrder, subtask.order), data[0]!.order);
  }, [data]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.order - b.order);
  }, [data]);

  const persistReorder = useCallback(
    async (orderedSubtasks: SubtaskDTO[]) => {
      const next = orderedSubtasks.map((subtask, index) => ({
        ...subtask,
        order: orderBase + index,
      }));
      setData(next);
      await onReorder?.(next);
    },
    [onReorder, orderBase],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1">
        <Animated.ScrollView ref={scrollableRef} contentContainerStyle={{ paddingBottom: 12 }}>
          <Sortable.Flex
            sortEnabled={isEditMode}
            overDrag="vertical"
            bringToFrontWhenActive
            dimensionsAnimationType="none"
            flexDirection="column"
            flexWrap="nowrap"
            width="fill"
            activeItemOpacity={0.8}
            inactiveItemOpacity={1}
            dragActivationDelay={250}
            activationAnimationDuration={150}
            dropAnimationDuration={220}
            autoScrollEnabled
            scrollableRef={scrollableRef}
            autoScrollDirection="vertical"
            autoScrollActivationOffset={60}
            autoScrollMaxOverscroll={80}
            autoScrollMaxVelocity={900}
            onDragEnd={({ order }) => {
              void persistReorder(order(sortedData));
            }}
          >
            {sortedData.map((item) => (
              <View key={item.subTaskId.toString()}>
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
              </View>
            ))}
          </Sortable.Flex>
        </Animated.ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};
