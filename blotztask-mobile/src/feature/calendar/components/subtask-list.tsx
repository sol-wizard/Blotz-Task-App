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
import TasksCheckbox from "@/feature/task-details/components/task-checkbox";
import { convertDurationToText } from "@/shared/util/convert-duration";

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
    <Animated.View style={[{ overflow: "hidden" }, subtaskClipStyle]} className="mt-2">
      {/* This inner content is what we measure */}
      <View className="pr-2 pl-1" onLayout={onSubtaskContentLayout}>
        {task.subtasks?.map((subtask: SubtaskDTO) => (
          <View
            key={subtask.subTaskId}
            className="flex-row w-full pt-2 justify-between items-start"
          >
            <View className="flex-row">
              <TasksCheckbox
                checked={subtask.isDone}
                disabled={isTogglingSubtaskStatus}
                size={20}
                className="mr-3 border"
                onChange={() => handleToggleSubtask(subtask.subTaskId)}
              />

              <Text
                className={`text-base font-baloo ${
                  subtask.isDone ? "text-gray-400 line-through opacity-60" : "text-gray-700"
                }`}
                numberOfLines={1}
              >
                {subtask.title}
              </Text>
            </View>

            {subtask.duration && (
              <Text className="text-sm text-gray-400 font-baloo ml-2 text-right">
                {convertDurationToText(subtask.duration)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
};
export default SubtaskList;
