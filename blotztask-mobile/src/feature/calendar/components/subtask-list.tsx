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
import SubtaskItem from "@/feature/task-details/components/subtask-item";

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
        {task.subtasks?.map((subtask: SubtaskDTO, index: number) => {
          const raw = subtask?.duration;
          const minutes =
            typeof raw === "string" && raw.includes(":")
              ? (() => {
                  const [hh, mm, ss] = raw.split(":").map((x) => Number(x));
                  if ([hh, mm, ss].some((n) => Number.isNaN(n))) return null;
                  return hh * 60 + mm + Math.floor(ss / 60);
                })()
              : typeof raw === "string" && raw.includes("min")
                ? parseInt(raw.replace("min", ""))
                : typeof raw === "string" && raw.includes("h")
                  ? parseInt(raw.replace("h", "")) * 60
                  : null;

          const isWarmup = index === 0 && minutes !== null && minutes < 5;

          //console.log("DEBUG:", { index, raw, minutes, isWarmup, subtaskTitle: subtask.title });

          return (
            <SubtaskItem
              key={subtask.subTaskId}
              item={{
                id: subtask.subTaskId,
                title: subtask.title,
                duration: subtask.duration,
                isDone: subtask.isDone,
              }}
              isWarmup={isWarmup}
              onToggle={() => handleToggleSubtask(subtask.subTaskId)}
            />
          );
        })}
      </View>
    </Animated.View>
  );
};

export default SubtaskList;
