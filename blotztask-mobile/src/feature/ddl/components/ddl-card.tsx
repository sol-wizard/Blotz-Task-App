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
import useDdlMutation from "../hooks/useDdlMutation";

type RightActionsProps = {
  progress: SharedValue<number>;
  onPin: () => void;
  onDelete: () => void;
  disabled: boolean;
};

const RightActions = ({ progress, onPin, onDelete, disabled }: RightActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 120 * (1 - progress.value) }],
  }));

  return (
    <Animated.View
      className="w-50 flex-row items-center justify-end gap-3 pl-4"
      style={animatedStyle}
    >
      <Pressable
        disabled={disabled}
        onPress={onPin}
        className={`h-20 w-20 items-center justify-center rounded-2xl ${
          disabled ? "bg-[#E7EFDf]" : "bg-[#DCF5C7]"
        }`}
      >
        <MaterialCommunityIcons name="arrow-up-bold" size={22} color="#5B9E2E" />
      </Pressable>

      <Pressable
        disabled={disabled}
        onPress={onDelete}
        className={`h-20 w-20 items-center justify-center rounded-2xl ${
          disabled ? "bg-[#F8EEEE]" : "bg-[#FCE4E4]"
        }`}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#E05C5C" />
      </Pressable>
    </Animated.View>
  );
};

const DdlCard = ({ task }: { task: DeadlineTaskDTO }) => {
  const swipeRef = useRef<SwipeableMethods | null>(null);
  const { t } = useTranslation("deadline");
  const { updatePin, deleteDeadlineTask, isUpdatingPin, isDeletingDeadlineTask } = useDdlMutation();

  const daysLeft = Math.max(0, differenceInCalendarDays(new Date(task.dueAt), new Date()));
  const labelColor = task.label?.color ?? "#D1D1D6";
  const endTimeDisplay = task.dueAt ? format(new Date(task.dueAt), "dd/MM/yy") : "—";
  const isActionPending = isUpdatingPin || isDeletingDeadlineTask;
  const isPinned = task.isPinned;

  const renderRightActions = (progress: SharedValue<number>) => {
    return (
      <RightActions
        progress={progress}
        onPin={() =>
          updatePin(
            { taskId: task.id, isPinned: !task.isPinned },
            {
              onSuccess: () => swipeRef.current?.close(),
              onError: (error) => console.error("Failed to pin deadline task:", error),
            },
          )
        }
        onDelete={() =>
          deleteDeadlineTask(task.id, {
            onSuccess: () => swipeRef.current?.close(),
            onError: (error) => console.error("Failed to delete deadline task:", error),
          })
        }
        disabled={isActionPending}
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
      {isPinned ? (
        <View className="bg-white rounded-[28px] min-h-32 px-2 py-4 flex-row items-center">
          <View className="absolute top-2.5 right-2.5">
            <MaterialCommunityIcons name="arrow-collapse-up" size={20} color="#9A9A9A" />
          </View>

          <View className="w-12 items-center justify-center">
            <TasksCheckbox type="task" checked={task.isDone} onChange={() => {}} />
          </View>

          <View
            className="h-10 w-1.5 rounded-full ml-1 mx-4"
            style={{ backgroundColor: labelColor }}
          />

          <View className="flex-1 justify-center py-1 pr-3">
            <Text
              className="font-balooBold text-[25px] leading-[30px] text-secondary underline"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {task.title}
            </Text>
            <Text className="mt-0.5 text-[16px] leading-5 text-gray-400 font-medium">
              {endTimeDisplay}
            </Text>
          </View>

          <View className="w-20 self-stretch justify-center items-start -ml-2">
            <View className="items-center">
              <Text className="font-baloo text-[52px] leading-[70px] text-[#9AD80A]">
                {daysLeft}
              </Text>
              <Text className="text-[14px] leading-4 text-[#9AD80A] font-medium -mt-5">
                {t("days")}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View
          className="bg-white rounded-2xl px-4 py-3 flex-row items-center h-20 justify-center"
          style={{ gap: 12 }}
        >
          <TasksCheckbox type="task" checked={task.isDone} onChange={() => {}} />

          <View className="h-10 w-1.5 rounded-full" style={{ backgroundColor: labelColor }} />

          <View className="flex-1">
            <Text className="font-baloo text-lg text-gray-800" numberOfLines={1}>
              {task.title}
            </Text>
            <Text className="font-balooThin text-gray-400">{endTimeDisplay}</Text>
          </View>

          <View className="flex-row items-center justify-center pt-3">
            <Text className="font-baloo text-4xl text-secondary leading-none pt-2">{daysLeft}</Text>
            <Text className="ml-1 font-balooThin text-xs text-gray-400">{t("days")}</Text>
          </View>
        </View>
      )}
    </ReanimatedSwipeable>
  );
};

export default DdlCard;
