import { cancelNotification } from "@/shared/util/cancel-notification";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

type RightActionsProps = {
  progress: SharedValue<number>;
  task: TaskDetailDTO;
  deleteTask: (task: TaskDetailDTO) => void | Promise<void>;
  handleBreakdown: () => void | Promise<void>;
  isLoading: boolean;
  isDeleting: boolean;
  isRefreshingSubtasks: boolean;
  onClose: () => void;
};
export const TaskCardRightActions = ({
  progress,
  task,
  deleteTask,
  handleBreakdown,
  isLoading,
  isDeleting,
  isRefreshingSubtasks,
  onClose,
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
        onPress={handleBreakdown}
        disabled={isLoading}
        className={`h-20 w-32 rounded-3xl bg-blue-500/10 items-center justify-center ${
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
        onPress={async () => {
          if (isLoading || task.id == null) return;
          await deleteTask(task);

          if (task.alertTime && new Date(task.alertTime) > new Date()) {
            await cancelNotification({ notificationId: task.notificationId });
          }

          onClose();
        }}
        disabled={isLoading}
        className={`h-20 w-20 rounded-3xl bg-red-500/10 items-center justify-center ${
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
