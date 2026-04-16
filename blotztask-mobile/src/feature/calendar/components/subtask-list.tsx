import { View, Text, Pressable, LayoutChangeEvent } from "react-native";
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
import TasksCheckbox from "@/shared/components/task-checkbox";
import { convertDurationToText } from "@/shared/util/convert-duration";

type Props = {
  task: TaskDetailDTO;
  progress: DerivedValue<0 | 1>;
};

const SubtaskList = ({ task, progress }: Props) => {
  const contentHeight = useSharedValue(0);
  const { toggleSubtaskStatus, isTogglingSubtaskStatus } = useSubtaskMutations();

  const subtaskClipStyle = useAnimatedStyle(() => ({
    height:
      contentHeight.value === 0
        ? undefined
        : interpolate(progress.value, [0, 1], [0, contentHeight.value], Extrapolation.CLAMP),
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    overflow: "hidden",
  }));

  const handleToggleSubtask = async (subtaskId: number) => {
    await toggleSubtaskStatus({ subtaskId, parentTaskId: task.id });
  };

  const onSubtaskContentLayout = (e: LayoutChangeEvent) => {
    const h = e?.nativeEvent?.layout?.height ?? 0;
    if (h > 0 && contentHeight.value !== h) {
      contentHeight.value = h;
    }
  };

  const subtaskItems = task.subtasks?.map((subtask: SubtaskDTO) => (
    <Pressable
      key={subtask.subTaskId}
      onPress={() => handleToggleSubtask(subtask.subTaskId)}
      disabled={isTogglingSubtaskStatus}
      className={`flex-row items-center py-2 ${isTogglingSubtaskStatus ? "opacity-50" : ""}`}
    >
      <TasksCheckbox
        type="subtask"
        checked={subtask.isDone}
        disabled={isTogglingSubtaskStatus}
        className="mr-3"
        onChange={() => handleToggleSubtask(subtask.subTaskId)}
      />
      <Text
        className={`flex-1 text-base font-inner ${
          subtask.isDone ? "text-gray-400 line-through opacity-60" : "text-gray-700"
        }`}
        numberOfLines={1}
      >
        {subtask.title}
      </Text>
      {subtask.duration && (
        <Text className="text-sm text-gray-400 font-inner ml-2">
          {convertDurationToText(subtask.duration)}
        </Text>
      )}
    </Pressable>
  ));

  return (
    <View>
      <View
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        onLayout={onSubtaskContentLayout}
      >
        {subtaskItems}
      </View>
      <Animated.View style={subtaskClipStyle}>{subtaskItems}</Animated.View>
    </View>
  );
};
export default SubtaskList;
