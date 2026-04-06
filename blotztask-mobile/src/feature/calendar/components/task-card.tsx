import React, { useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { MaterialIcons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import TasksCheckbox from "@/shared/components/ui/task-checkbox";

import { SharedValue, useDerivedValue, withTiming } from "react-native-reanimated";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { queryClient } from "@/shared/util/queryClient";
import { router } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useRecurringTaskMutations } from "../hooks/useRecurringTaskMutations";
import { useSubtaskMutations } from "@/feature/task-details/hooks/useSubtaskMutations";
import { cancelNotification } from "@/shared/util/cancel-notification";
import { formatDateRange } from "../util/format-date-range";
import { AnimatedChevron } from "@/shared/components/ui/chevron";
import { SubtaskProgressBar } from "./subtask-progress-bar";
import SubtaskList from "./subtask-list";
import { TaskCardRightActions } from "./task-card-right-actions";

// Props
interface TaskCardProps {
  task: TaskDetailDTO;
  deleteTask: (task: TaskDetailDTO) => void;
  isDeleting: boolean;
  selectedDay?: Date;
}

const TaskCard = ({ task, deleteTask, isDeleting, selectedDay }: TaskCardProps) => {
  const swipeRef = useRef<SwipeableMethods | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = useDerivedValue(() => withTiming(isExpanded ? 1 : 0, { duration: 220 }));

  // Mutations
  const { toggleTask, isToggling } = useTaskMutations();
  const { completeOccurrence, isPending: isCompletingOccurrence } = useRecurringTaskMutations();
  const { breakDownAndReplaceSubtasks, isBreakingDownAndReplacingSubtasks } = useSubtaskMutations();

  // Derived values
  const labelColor = task.label?.color ?? "#D1D1D6";
  const hasSubtasks = !!task.subtasks?.length;
  const timePeriod = formatDateRange({
    startTime: task.startTime,
    endTime: task.endTime,
    selectedDay,
  });
  const isOverdue = parseISO(task.endTime).getTime() <= new Date().getTime() && !task.isDone;
  const isLoading =
    isToggling || isDeleting || isBreakingDownAndReplacingSubtasks || isCompletingOccurrence;

  // Functions
  const handleOpenTaskDetails = () => {
    if (task.id == null) return;

    queryClient.setQueryData(["taskId", task.id], task);
    router.push({ pathname: "/(protected)/task-details", params: { taskId: task.id } });
  };

  const handleBreakdown = async () => {
    if (isLoading || task.id == null) return;

    try {
      const result = await breakDownAndReplaceSubtasks(task.id);
      if (result?.subtasks?.length) {
        setIsExpanded(true);
        swipeRef.current?.close();
      }
    } catch (e) {
      console.error("Breakdown error:", e);
    }
  };

  const handleDelete = async () => {
    if (isLoading || task.id == null) return;

    await deleteTask(task);

    if (task.alertTime && new Date(task.alertTime) > new Date()) {
      await cancelNotification({ notificationId: task.notificationId });
    }

    swipeRef.current?.close();
  };

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={(rightActionsProgress: SharedValue<number>) => (
        <TaskCardRightActions
          progress={rightActionsProgress}
          onBreakdown={handleBreakdown}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          isRefreshingSubtasks={isBreakingDownAndReplacingSubtasks}
        />
      )}
      rightThreshold={12}
      overshootRight={false}
      friction={2}
      dragOffsetFromLeftEdge={8}
    >
      <View className="flex-col bg-white rounded-2xl px-4 py-3 min-h-20 justify-center">
        <View className="justify-center">
          <View className="flex-row items-center" style={{ gap: 12 }}>
            {/* Checkbox */}
            <TasksCheckbox
              checked={task.isDone}
              disabled={isLoading}
              onChange={async () => {
                if (!task.id) {
                  completeOccurrence({
                    recurringTaskId: task.recurringTaskId!,
                    occurrenceDate: format(selectedDay!, "yyyy-MM-dd"),
                  });
                  return;
                }
                toggleTask({ taskId: task.id!, selectedDay });
                if (task.alertTime && new Date(task.alertTime) > new Date()) {
                  await cancelNotification({ notificationId: task?.notificationId });
                }
              }}
            />

            {/* Vertical label colour bar */}
            <View className="h-10 w-1.5 rounded-full" style={{ backgroundColor: labelColor }} />

            {/* DDL Tag */}
            {task.isDeadline && (
              <View className="px-1 py-0.5 rounded bg-highlight items-center justify-center">
                <Text className="text-white font-balooBold text-xs mt-0.5">DDL</Text>
              </View>
            )}

            {/* Title + date */}
            <Pressable className="flex-1 " onPress={handleOpenTaskDetails} disabled={isLoading}>
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <Text
                  className={`text-xl font-semibold font-inter ${
                    task.isDone ? "text-neutral-400 line-through" : "text-[#444964]"
                  }`}
                  style={
                    task.isDone
                      ? {
                          textDecorationLine: "line-through",
                          textDecorationColor: "#9CA3AF",
                        }
                      : undefined
                  }
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                {task.recurringTaskId && (
                  <View className="ml-1.5">
                    <MaterialIcons name="autorenew" size={17} color="#9CA3AF" />
                  </View>
                )}
              </View>
              {timePeriod && <Text className="font-balooThin text-gray-400">{timePeriod}</Text>}
            </Pressable>

            <View className="flex-row items-center">
              <Text
                className={`${
                  isOverdue ? "text-warning" : "text-primary"
                } font-inter font-semibold text-lg`}
              >
                {format(parseISO(task.endTime), "H:mm")}
              </Text>

              <View className="ml-2 w-6 items-center justify-center">
                {hasSubtasks && (
                  <Pressable
                    onPress={() => setIsExpanded((v) => !v)}
                    className="p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    disabled={isLoading}
                  >
                    <AnimatedChevron color="#9CA3AF" progress={progress} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
          {hasSubtasks && <SubtaskProgressBar subtasks={task.subtasks} />}
        </View>
        {hasSubtasks && <SubtaskList task={task} progress={progress} />}
      </View>
    </ReanimatedSwipeable>
  );
};

export default TaskCard;
