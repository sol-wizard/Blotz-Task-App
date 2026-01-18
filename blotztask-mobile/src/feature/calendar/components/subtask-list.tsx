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
import { MaterialIcons } from "@expo/vector-icons";
import { convertDurationToText } from "@/shared/util/convert-duration";
import { useSubtaskMutations } from "@/feature/task-details/hooks/useSubtaskMutations";

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
            className={`flex-row items-center py-2 ${isTogglingSubtaskStatus ? "opacity-50" : ""}`}
          >
            <View
              className={`w-6 h-6 rounded-lg mr-3 items-center justify-center border-2 ${
                subtask.isDone ? "bg-[#4CAF50] border-[#4CAF50]" : "bg-white border-gray-300"
              }`}
            >
              {subtask.isDone && <MaterialIcons name="check" size={16} color="white" />}
            </View>

            <Text
              className={`flex-1 text-base font-baloo ${
                subtask.isDone ? "text-gray-400 line-through opacity-60" : "text-gray-700"
              }`}
              numberOfLines={1}
            >
              {subtask.title}
            </Text>

            {subtask.duration && (
              <Text className="text-sm text-gray-400 font-baloo ml-2">
                {convertDurationToText(subtask.duration)}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
};

export default SubtaskList;
