import { View, Text, Pressable } from "react-native";
import React from "react";
import Animated, {
  DerivedValue,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { useSubtaskMutations } from "@/feature/task-details/hooks/useSubtaskMutations";
import { TaskCheckbox } from "@/shared/components/ui/task-checkbox";

type Props = {
  task: TaskDetailDTO;
  progress: DerivedValue<0 | 1>;
};

const SubtaskList = ({ task, progress }: Props) => {
  const contentHeight = useSharedValue(0);
  const { toggleSubtaskStatus, isTogglingSubtaskStatus } = useSubtaskMutations();

  const subtaskClipStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [0, contentHeight.value], Extrapolation.CLAMP),
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const handleToggleSubtask = async (subtaskId: number) => {
    await toggleSubtaskStatus({ subtaskId, parentTaskId: task.id });
  };

  const onSubtaskContentLayout = (e: any) => {
    const h = e?.nativeEvent?.layout?.height ?? 0;
    if (h > 0 && contentHeight.value !== h) {
      contentHeight.value = h;
    }
  };

  return (
    <Animated.View style={[{ overflow: "hidden" }, subtaskClipStyle]}>
      {/* This inner content is what we measure */}
      <View className="px-5 pb-4" onLayout={onSubtaskContentLayout}>
        {task.subtasks?.map((subtask: SubtaskDTO) => (
          <Pressable
            key={subtask.subTaskId}
            onPress={() => handleToggleSubtask(subtask.subTaskId)}
            disabled={isTogglingSubtaskStatus}
            className={`justify-between flex-row items-center py-2 ${isTogglingSubtaskStatus ? "opacity-50" : ""}`}
          >
            <TaskCheckbox
              checked={subtask.isDone}
              onPress={() => handleToggleSubtask(subtask.subTaskId)}
              haptic={!subtask.isDone}
              size={32}
            />
            <View className="flex-1">
              <Text
                className={`text-base font-baloo ${
                  subtask.isDone ? "text-gray-400 line-through opacity-60" : "text-gray-700"
                }`}
              >
                {subtask.title}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
};

export default SubtaskList;
