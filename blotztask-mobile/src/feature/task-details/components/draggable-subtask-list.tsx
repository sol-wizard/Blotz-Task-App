import React, { useState, useRef, useEffect } from "react";
import { View, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
  withTiming,
  useDerivedValue,
  runOnUI,
} from "react-native-reanimated";
import { 
  PanGestureHandler, 
  LongPressGestureHandler,
  State,
  ScrollView,
} from "react-native-gesture-handler";
import SubtaskItem from "./subtask-item";

type DraggableSubtaskListProps = {
  subtasks: any[];
  onToggle: (id: number) => void;
  color?: string;
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  scrollOffsetRef?: React.RefObject<number>;
};

type DraggableItemProps = {
  item: any;
  index: number;
  onToggle: (id: number) => void;
  color?: string;
  isEditMode?: boolean;
  onDelete?: (id: number) => void;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, y: number, absoluteY: number) => void;
  onDragEnd: () => void;
  draggingIndex: number;
  itemHeight: number;
  draggingIndexShared: Animated.SharedValue<number>;
  targetIndexShared: Animated.SharedValue<number>;
  scrollOffsetShared: Animated.SharedValue<number>;
  dragStartScrollOffsetShared: Animated.SharedValue<number>;
};

const ITEM_HEIGHT = 65; // Approximate height of each subtask item
const LONG_PRESS_DURATION = 500; // milliseconds
const AUTO_SCROLL_DELAY = 300; // ms delay before auto-scroll starts
const AUTO_SCROLL_SPEED = 5; // Pixels to scroll per interval (reduced for smoother experience)
const AUTO_SCROLL_INTERVAL = 16; // ms between scroll updates (~60fps)

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
  scrollOffsetShared,
  dragStartScrollOffsetShared,
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
        return -itemHeight;
      }
    }
    // Dragging UP (e.g., from 3 to 1): items 1,2 move DOWN to make space at position 1
    else if (currentDraggingIndex > currentTargetIndex) {
      if (index >= currentTargetIndex && index < currentDraggingIndex) {
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
      // Don't read dragStartScrollOffset here - will be set by handleDragStart
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
        // Pass both translationY and absoluteY for auto-scroll detection
        runOnJS(onDragMove)(index, event.translationY, event.absoluteY);
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
    
    // Calculate scroll compensation for dragged item
    let finalTranslateY;
    if (isDragging.value) {
      // Compensate for scroll offset changes during drag
      // When scrolling DOWN (scrollOffset increases), content moves UP, so item needs to move DOWN
      const scrollDelta = scrollOffsetShared.value - dragStartScrollOffsetShared.value;
      finalTranslateY = translateY.value + scrollDelta;
      
    } else {
      // Apply smooth animation to the offset for non-dragged items
      finalTranslateY = withTiming(offsetY.value, { duration: 300 });
    }
    
    return {
      transform: [
        { translateY: finalTranslateY },
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
  scrollViewRef,
  scrollOffsetRef,
}: DraggableSubtaskListProps) {
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const draggingIndexShared = useSharedValue(-1);
  const targetIndexShared = useSharedValue(-1);
  const finalTranslationY = useSharedValue(0);
  const scrollOffsetShared = useSharedValue(0); // Track scroll offset for drag compensation
  const dragStartScrollOffsetShared = useSharedValue(0); // Track where drag started
  
  // Auto-scroll state
  const autoScrollTimerRef = useRef<number | null>(null);
  const autoScrollDelayTimerRef = useRef<number | null>(null);
  const currentScrollOffsetRef = useRef(0);
  const dragStartScrollOffset = useRef(0);
  const currentDragPositionRef = useRef({ absoluteY: 0, isNearEdge: false, scrollDirection: 0 });
  const scrollLogCountRef = useRef(0);
  
  // Sync scroll offset from parent to shared value on mount and when not dragging
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (draggingIndex === -1 && scrollOffsetRef) {
        const currentOffset = scrollOffsetRef.current || 0;
        if (scrollOffsetShared.value !== currentOffset) {
          scrollOffsetShared.value = currentOffset;
        }
      }
    }, 100); // Sync every 100ms when idle
    
    return () => clearInterval(syncInterval);
  }, [draggingIndex, scrollOffsetRef, scrollOffsetShared]);
  
  // Cleanup auto-scroll timers on unmount or when dragging ends
  useEffect(() => {
    return () => {
      if (autoScrollDelayTimerRef.current) {
        clearTimeout(autoScrollDelayTimerRef.current);
      }
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, []);

  // Clear auto-scroll timers
  const clearAutoScroll = () => {
    if (autoScrollDelayTimerRef.current) {
      clearTimeout(autoScrollDelayTimerRef.current);
      autoScrollDelayTimerRef.current = null;
    }
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  };

  const handleDragStart = (index: number) => {
    // CRITICAL: Sync scroll offset FIRST before anything else
    const initialScrollOffset = scrollOffsetRef?.current || 0;
    
    // Update all scroll tracking values synchronously
    runOnUI(() => {
      'worklet';
      scrollOffsetShared.value = initialScrollOffset;
      dragStartScrollOffsetShared.value = initialScrollOffset;
    })();
    
    dragStartScrollOffset.current = initialScrollOffset;
    currentScrollOffsetRef.current = initialScrollOffset;
    
    console.log(`🎬 handleDragStart: item=${index}, scrollOffset=${initialScrollOffset}`);
    
    setDraggingIndex(index);
    draggingIndexShared.value = index;
    targetIndexShared.value = index;
    clearAutoScroll();
    currentDragPositionRef.current = { absoluteY: 0, isNearEdge: false, scrollDirection: 0 };
  };

  const handleDragMove = (fromIndex: number, translationY: number, absoluteY: number) => {
    // translationY is the distance moved from the starting point
    finalTranslationY.value = translationY;
    const indexDiff = Math.round(translationY / ITEM_HEIGHT);
    const newTargetIndex = Math.max(0, Math.min(subtasks.length - 1, fromIndex + indexDiff));
    
    // Update target index immediately so other items can react
    targetIndexShared.value = newTargetIndex;
    
    // Auto-scroll logic - use screen-based detection
    const screenHeight = Dimensions.get('window').height;
    const SCREEN_TOP_THRESHOLD = 200; // Top 200px of screen
    const SCREEN_BOTTOM_THRESHOLD = screenHeight - 200; // Bottom 200px of screen
    
    // Use hysteresis to prevent jitter
    const wasNearEdge = currentDragPositionRef.current.isNearEdge;
    const topThreshold = wasNearEdge ? SCREEN_TOP_THRESHOLD + 20 : SCREEN_TOP_THRESHOLD;
    const bottomThreshold = wasNearEdge ? SCREEN_BOTTOM_THRESHOLD - 20 : SCREEN_BOTTOM_THRESHOLD;
    
    // Check if near top or bottom of SCREEN (not container)
    const nearTop = absoluteY < topThreshold;
    const nearBottom = absoluteY > bottomThreshold;
    const isNearEdge = nearTop || nearBottom;
    const scrollDirection = nearTop ? -1 : (nearBottom ? 1 : 0);
    
    // Debug logging - track edge state changes
    if (isNearEdge && !wasNearEdge) {
      console.log(`Edge ENTER: absoluteY=${absoluteY.toFixed(0)}, screenHeight=${screenHeight.toFixed(0)}, topThreshold=${topThreshold.toFixed(0)}, bottomThreshold=${bottomThreshold.toFixed(0)}, nearTop=${nearTop}, nearBottom=${nearBottom}, direction=${scrollDirection}`);
    } else if (!isNearEdge && wasNearEdge) {
      console.log(`Edge EXIT: absoluteY=${absoluteY.toFixed(0)}, topThreshold=${topThreshold.toFixed(0)}, bottomThreshold=${bottomThreshold.toFixed(0)}`);
    }
    
    // Update current drag position for timer to read (used by setInterval callback)
    currentDragPositionRef.current = {
      absoluteY,
      isNearEdge,
      scrollDirection,
    };
    
    if (isNearEdge) {
      // Start auto-scroll after delay if not already started
      if (!autoScrollDelayTimerRef.current && !autoScrollTimerRef.current) {
        console.log(`Starting auto-scroll delay timer (${AUTO_SCROLL_DELAY}ms)... scrollViewRef exists:`, !!scrollViewRef?.current);
        
        autoScrollDelayTimerRef.current = window.setTimeout(() => {
          console.log(`Delay complete, checking if still near edge...`);
          
          // Check if still near edge after delay
          const currentDragState = currentDragPositionRef.current;
          if (!currentDragState.isNearEdge || currentDragState.scrollDirection === 0) {
            console.log(`No longer near edge, canceling auto-scroll`);
            autoScrollDelayTimerRef.current = null;
            return;
          }
          
          autoScrollDelayTimerRef.current = null;
          console.log(`Starting continuous scroll interval`);
          
          // Start continuous scrolling - reads current state from ref
          autoScrollTimerRef.current = window.setInterval(() => {
            const dragState = currentDragPositionRef.current;
            
            // Stop if no longer near edge
            if (!dragState.isNearEdge || dragState.scrollDirection === 0) {
              console.log(`Auto-scroll stopped: not near edge`);
              clearAutoScroll();
              return;
            }
            
            if (scrollViewRef?.current) {
              // Get current scroll position from parent ref (source of truth)
              const currentOffset = scrollOffsetRef?.current || 0;
              const newOffset = currentOffset + (dragState.scrollDirection * AUTO_SCROLL_SPEED);
              const clampedOffset = Math.max(0, newOffset);
              
              // Debug: log every 10th scroll to reduce spam
              scrollLogCountRef.current++;
              if (scrollLogCountRef.current % 10 === 0) {
                console.log(`Auto-scroll: ${dragState.scrollDirection > 0 ? '↓ DOWN' : '↑ UP'} | offset: ${clampedOffset.toFixed(0)}px`);
              }
              
              scrollViewRef.current.scrollTo({ y: clampedOffset, animated: false });
              // Update both local and parent refs after scrolling
              currentScrollOffsetRef.current = clampedOffset;
              if (scrollOffsetRef) {
                scrollOffsetRef.current = clampedOffset;
              }
              // Update shared value for drag compensation
              scrollOffsetShared.value = clampedOffset;
            }
          }, AUTO_SCROLL_INTERVAL);
        }, AUTO_SCROLL_DELAY);
      }
      // If timer already running, do nothing - keep it running
    } else {
      // Clear auto-scroll if not near edges
      if (autoScrollDelayTimerRef.current || autoScrollTimerRef.current) {
        console.log(`Leaving edge, clearing timers`);
        clearAutoScroll();
      }
    }
  };

  const handleDragEnd = () => {
    // Clear auto-scroll timers
    clearAutoScroll();
    
    // Reset drag position state
    currentDragPositionRef.current = { absoluteY: 0, isNearEdge: false, scrollDirection: 0 };
    scrollLogCountRef.current = 0;
    
    if (draggingIndex !== -1) {
      // Calculate scroll delta during drag
      const scrollDelta = scrollOffsetShared.value - dragStartScrollOffset.current;
      // Adjust translation for scroll offset change
      const adjustedTranslationY = finalTranslationY.value + scrollDelta;
      const indexDiff = Math.round(adjustedTranslationY / ITEM_HEIGHT);
      const newIndex = Math.max(0, Math.min(subtasks.length - 1, draggingIndex + indexDiff));
      
      console.log(`Drop: translationY=${finalTranslationY.value.toFixed(0)}, scrollDelta=${scrollDelta.toFixed(0)}, adjusted=${adjustedTranslationY.toFixed(0)}, from=${draggingIndex} to=${newIndex}`);
      
      if (newIndex !== draggingIndex) {
        onReorder(draggingIndex, newIndex);
      }
    }
    setDraggingIndex(-1);
    draggingIndexShared.value = -1;
    targetIndexShared.value = -1;
    finalTranslationY.value = 0;
    // Don't update scrollOffsetShared here - let it be updated naturally
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
          scrollOffsetShared={scrollOffsetShared}
          dragStartScrollOffsetShared={dragStartScrollOffsetShared}
        />
      ))}
    </View>
  );
}
