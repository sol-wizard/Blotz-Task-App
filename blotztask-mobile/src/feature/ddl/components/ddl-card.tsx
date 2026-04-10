import React, { useRef } from "react";
import { View, Text, Pressable } from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { differenceInCalendarDays, format } from "date-fns";
import TasksCheckbox from "@/shared/components/task-checkbox";
import { DeadlineTaskDTO } from "../models/deadline-task-dto";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

type RightActionsProps = {
  progress: SharedValue<number>;
  taskId: number;
  onClose: () => void;
};

const RightActions = ({ progress, taskId, onClose }: RightActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 120 * (1 - progress.value) }],
  }));

  return (
    <Animated.View
      className="w-50 flex-row items-center justify-end gap-3 pl-4"
      style={animatedStyle}
    >
      <Pressable
        onPress={() => {
          console.log("Pin task", taskId);
          onClose();
        }}
        className="h-20 w-20 items-center justify-center rounded-2xl bg-[#DCF5C7]"
      >
        <MaterialCommunityIcons name="arrow-up-bold" size={22} color="#5B9E2E" />
      </Pressable>

      <Pressable
        onPress={() => {
          console.log("Delete task", taskId);
          onClose();
        }}
        className="h-20 w-20 items-center justify-center rounded-2xl bg-[#FCE4E4]"
      >
        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#E05C5C" />
      </Pressable>
    </Animated.View>
  );
};

const DdlCard = ({ task }: { task: DeadlineTaskDTO }) => {
  const swipeRef = useRef<SwipeableMethods | null>(null);
  const { t } = useTranslation("deadline");

  const daysLeft = Math.max(0, differenceInCalendarDays(new Date(task.dueAt), new Date()));

  const labelColor = task.label?.color ?? "#D1D1D6";

  const endTimeDisplay = task.dueAt ? format(new Date(task.dueAt), "dd/MM/yy") : "—";

  const renderRightActions = (progress: SharedValue<number>) => {
    return (
      <RightActions
        progress={progress}
        taskId={task.id}
        onClose={() => swipeRef.current?.close()}
      />
    );
  };

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={12}
      overshootRight={false}
      friction={2}
      dragOffsetFromLeftEdge={8}
    >
      <View
        className="bg-white rounded-2xl px-4 py-3 flex-row items-center h-20 justify-center"
        style={{ gap: 12 }}
      >
        {/* Checkbox */}
        <TasksCheckbox type="task" checked={task.isDone} onChange={() => {}} />

        {/* Vertical label colour bar */}
        <View className="h-10 w-1.5 rounded-full" style={{ backgroundColor: labelColor }} />

        {/* Title + date */}
        <View className="flex-1">
          <Text className="font-baloo text-lg text-gray-800" numberOfLines={1}>
            {task.title}
          </Text>
          <Text className="font-balooThin text-gray-400">{endTimeDisplay}</Text>
        </View>

        {/* Days left */}
        <View className="flex-row items-center justify-center pt-3">
          <Text className="font-baloo text-4xl text-secondary leading-none pt-2">{daysLeft}</Text>
          <Text className="ml-1 font-balooThin text-xs text-gray-400">{t("days")}</Text>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
};

export default DdlCard;
