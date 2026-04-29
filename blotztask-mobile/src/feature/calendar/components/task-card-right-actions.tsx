import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";

type RightActionsProps = {
  progress: SharedValue<number>;
  onBreakdown: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  isDeleting: boolean;
  isRefreshingSubtasks: boolean;
};
export const TaskCardRightActions = ({
  progress,
  onBreakdown,
  onDelete,
  isDeleting,
  isRefreshingSubtasks,
}: RightActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 120 * (1 - progress.value) }],
  }));

  return (
    <Animated.View
      className="w-60 self-start flex-row items-start justify-end gap-3 pl-4"
      style={animatedStyle}
    >
      <Pressable
        onPress={onBreakdown}
        disabled={isDeleting || isRefreshingSubtasks}
        className={`min-h-20 w-32 rounded-3xl bg-blue-500/10 items-center justify-center ${
          isRefreshingSubtasks ? "opacity-50" : ""
        }`}
      >
        {isRefreshingSubtasks ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : (
          <Text className="text-info font-inter font-semibold text-lg">Breakdown</Text>
        )}
      </Pressable>

      <Pressable
        onPress={onDelete}
        disabled={isDeleting || isRefreshingSubtasks}
        className={`min-h-20 w-20 rounded-3xl bg-red-500/10 items-center justify-center ${
          isDeleting ? "opacity-50" : ""
        }`}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color="#F56767" />
        ) : (
          <MaterialCommunityIcons name="trash-can-outline" size={24} color="#F56767" />
        )}
      </Pressable>
    </Animated.View>
  );
};
