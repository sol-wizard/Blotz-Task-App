import React from "react";
import { Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";

type DdlRightActionsProps = {
  progress: SharedValue<number>;
  onPin: () => void;
  onDelete: () => void;
  isPinned: boolean;
  isUpdatingPin: boolean;
  isDeletingTask: boolean;
};

const DdlRightActions = ({
  progress,
  onPin,
  onDelete,
  isPinned,
  isUpdatingPin,
  isDeletingTask,
}: DdlRightActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 120 * (1 - progress.value) }],
  }));

  return (
    <Animated.View
      className="w-50 flex-row items-center justify-end gap-3 pl-4"
      style={animatedStyle}
    >
      <Pressable
        disabled={isUpdatingPin}
        onPress={onPin}
        className={`${isPinned ? "h-32" : "h-20"} w-20 items-center justify-center rounded-2xl ${
          isUpdatingPin ? "bg-[#E7EFDf]" : "bg-[#DCF5C7]"
        }`}
      >
        {isUpdatingPin ? (
          <ActivityIndicator size="small" color="#5B9E2E" />
        ) : (
          <MaterialCommunityIcons
            name={isPinned ? "pin-off" : "pin"}
            size={22}
            color="#5B9E2E"
          />
        )}
      </Pressable>

      <Pressable
        disabled={isDeletingTask}
        onPress={onDelete}
        className={`${isPinned ? "h-32" : "h-20"} w-20 items-center justify-center rounded-2xl ${
          isDeletingTask ? "bg-[#F8EEEE]" : "bg-[#FCE4E4]"
        }`}
      >
        {isDeletingTask ? (
          <ActivityIndicator size="small" color="#E05C5C" />
        ) : (
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#E05C5C" />
        )}
      </Pressable>
    </Animated.View>
  );
};

export default DdlRightActions;
