import React, { useState, useRef } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
} from "react-native-reanimated";
import { 
  PanGestureHandler, 
  LongPressGestureHandler,
  State,
} from "react-native-gesture-handler";
import SubtaskItem from "./subtask-item";

type DraggableSubtaskListProps = {
  subtasks: any[];
  onToggle: (id: number) => void;
  color?: string;
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

type DraggableItemProps = {
  item: any;
  index: number;
  onToggle: (id: number) => void;
  color?: string;
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, y: number) => void;
  onDragEnd: () => void;
  draggingIndex: number;
  itemHeight: number;
};

const ITEM_HEIGHT = 65; // Approximate height of each subtask item
const LONG_PRESS_DURATION = 500; // milliseconds

function DraggableItem({
  item,
  index,
  onToggle,
  color,
  isEditMode,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
  draggingIndex,
  itemHeight,
}: DraggableItemProps) {
  const translateY = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);
  
  const longPressRef = useRef(null);
  const panRef = useRef(null);

  const handleLongPress = (event: any) => {
    'worklet';
    if (event.nativeEvent.state === State.ACTIVE && isEditMode && !isDragging.value) {
      isDragging.value = true;
      scale.value = withSpring(1.02);
      runOnJS(onDragStart)(index);
    }
  };

  const onPanGestureEvent = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx: any) => {
      // Only process pan gestures if drag mode is activated (after long press)
      if (isEditMode && isDragging.value) {
        translateY.value = ctx.startY + event.translationY;
        runOnJS(onDragMove)(index, event.absoluteY);
      }
    },
    onEnd: () => {
      if (isEditMode && isDragging.value) {
        runOnJS(onDragEnd)();
        isDragging.value = false;
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const zIndex = isDragging.value ? 999 : index === draggingIndex ? 999 : 1;
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex,
      opacity: isDragging.value ? 0.9 : 1,
    };
  });

  if (!isEditMode) {
    // When not in edit mode, no gesture handlers needed
    return (
      <View>
        <SubtaskItem
          item={item}
          onToggle={onToggle}
          color={color}
          isEditMode={isEditMode}
          onDelete={onDelete}
        />
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <LongPressGestureHandler
        ref={longPressRef}
        onHandlerStateChange={handleLongPress}
        minDurationMs={LONG_PRESS_DURATION}
        shouldCancelWhenOutside={false}
        maxDist={15}
      >
        <Animated.View>
          <PanGestureHandler
            ref={panRef}
            onGestureEvent={onPanGestureEvent}
            simultaneousHandlers={longPressRef}
            activeOffsetY={[-20, 20]}
          >
            <Animated.View>
              <SubtaskItem
                item={item}
                onToggle={onToggle}
                color={color}
                isEditMode={isEditMode}
                onDelete={onDelete}
              />
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </LongPressGestureHandler>
    </Animated.View>
  );
}

export default function DraggableSubtaskList({
  subtasks,
  onToggle,
  color,
  isEditMode = false,
  onDelete,
  onReorder,
}: DraggableSubtaskListProps) {
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const dragStartY = useSharedValue(0);
  const dragCurrentY = useSharedValue(0);

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
    dragStartY.value = index * ITEM_HEIGHT;
  };

  const handleDragMove = (fromIndex: number, absoluteY: number) => {
    dragCurrentY.value = absoluteY;
  };

  const handleDragEnd = () => {
    if (draggingIndex !== -1) {
      const movedDistance = dragCurrentY.value - dragStartY.value;
      const indexDiff = Math.round(movedDistance / ITEM_HEIGHT);
      const newIndex = Math.max(0, Math.min(subtasks.length - 1, draggingIndex + indexDiff));
      
      if (newIndex !== draggingIndex) {
        onReorder(draggingIndex, newIndex);
      }
    }
    setDraggingIndex(-1);
    dragStartY.value = 0;
    dragCurrentY.value = 0;
  };

  return (
    <View>
      {subtasks.map((subtask, index) => (
        <DraggableItem
          key={subtask.id}
          item={subtask}
          index={index}
          onToggle={onToggle}
          color={color}
          isEditMode={isEditMode}
          onDelete={onDelete}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          draggingIndex={draggingIndex}
          itemHeight={ITEM_HEIGHT}
        />
      ))}
    </View>
  );
}
