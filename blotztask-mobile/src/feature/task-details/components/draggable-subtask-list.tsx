import React, { useState, useRef } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
  withDelay,
  withTiming,
  useDerivedValue,
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
  draggingIndexShared: Animated.SharedValue<number>;
  targetIndexShared: Animated.SharedValue<number>;
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
  draggingIndexShared,
  targetIndexShared,
}: DraggableItemProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);
  
  const longPressRef = useRef(null);
  const panRef = useRef(null);

  // Calculate offset based on drag state - items make space immediately
  const offsetY = useDerivedValue(() => {
    const currentDraggingIndex = draggingIndexShared.value;
    const currentTargetIndex = targetIndexShared.value;
    
    // If not dragging or this is the dragged item, no offset
    if (currentDraggingIndex === -1 || index === currentDraggingIndex) {
      return 0;
    }
    
    // Dragging DOWN (e.g., from 1 to 3): items 2,3 move UP to make space at position 3
    if (currentDraggingIndex < currentTargetIndex) {
      if (index > currentDraggingIndex && index <= currentTargetIndex) {
        console.log(`Item ${index}: Moving UP (dragging ${currentDraggingIndex} -> ${currentTargetIndex})`);
        return -itemHeight;
      }
    }
    // Dragging UP (e.g., from 3 to 1): items 1,2 move DOWN to make space at position 1
    else if (currentDraggingIndex > currentTargetIndex) {
      if (index >= currentTargetIndex && index < currentDraggingIndex) {
        console.log(`Item ${index}: Moving DOWN (dragging ${currentDraggingIndex} -> ${currentTargetIndex})`);
        return itemHeight;
      }
    }
    
    // No offset needed for this item
    return 0;
  });

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
        // Pass translationY instead of absoluteY
        runOnJS(onDragMove)(index, event.translationY);
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
    const zIndex = isDragging.value ? 999 : index === draggingIndexShared.value ? 999 : 1;
    
    // Apply smooth animation to the offset
    const animatedOffset = isDragging.value 
      ? translateY.value 
      : withTiming(offsetY.value, { duration: 300 });
    
    return {
      transform: [
        { translateY: animatedOffset },
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
  const draggingIndexShared = useSharedValue(-1);
  const targetIndexShared = useSharedValue(-1);
  const finalTranslationY = useSharedValue(0);

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
    draggingIndexShared.value = index;
    targetIndexShared.value = index;
    // Don't set dragStartY here, it will be set in the gesture handler
  };

  const handleDragMove = (fromIndex: number, translationY: number) => {
    // translationY is the distance moved from the starting point
    finalTranslationY.value = translationY;
    const indexDiff = Math.round(translationY / ITEM_HEIGHT);
    const newTargetIndex = Math.max(0, Math.min(subtasks.length - 1, fromIndex + indexDiff));
    
    // Update target index immediately so other items can react
    targetIndexShared.value = newTargetIndex;
    console.log(`Dragging from ${fromIndex}, translation: ${translationY.toFixed(0)}, indexDiff: ${indexDiff}, target: ${newTargetIndex}`);
  };

  const handleDragEnd = () => {
    if (draggingIndex !== -1) {
      const indexDiff = Math.round(finalTranslationY.value / ITEM_HEIGHT);
      const newIndex = Math.max(0, Math.min(subtasks.length - 1, draggingIndex + indexDiff));
      
      console.log(`Drag end: from ${draggingIndex} to ${newIndex}`);
      
      if (newIndex !== draggingIndex) {
        onReorder(draggingIndex, newIndex);
      }
    }
    setDraggingIndex(-1);
    draggingIndexShared.value = -1;
    targetIndexShared.value = -1;
    finalTranslationY.value = 0;
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
          draggingIndexShared={draggingIndexShared}
          targetIndexShared={targetIndexShared}
        />
      ))}
    </View>
  );
}
