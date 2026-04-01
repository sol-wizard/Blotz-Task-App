import React, { useRef } from "react";
import { View, Text, Pressable } from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { differenceInCalendarDays } from "date-fns";
import TasksCheckbox from "@/shared/components/ui/task-checkbox";
import { DeadlineTaskDTO } from "../models/deadline-task-dto";

type Props = {
  task: DeadlineTaskDTO;
};

const DdlCard = ({ task }: Props) => {
  const swipeRef = useRef<SwipeableMethods | null>(null);

  const daysLeft = Math.max(0, differenceInCalendarDays(new Date(task.dueAt), new Date()));

  const labelColor = task.label?.color ?? "#D1D1D6";

  const endTimeDisplay = task.endTime
    ? new Date(task.endTime).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "—";

  const renderRightActions = () => (
    <View className="flex-row items-center justify-end pr-4" style={{ gap: 12, width: 120 }}>
      <Pressable
        onPress={() => {
          console.log("Pin task", task.id, "isPinned:", !task.isPinned);
          swipeRef.current?.close();
        }}
        className="rounded-2xl items-center justify-center"
        style={{ backgroundColor: "#DCF5C7", width: 52, height: 52 }}
      >
        <MaterialCommunityIcons name="arrow-up-bold" size={22} color="#5B9E2E" />
      </Pressable>

      <Pressable
        onPress={() => {
          console.log("Delete task", task.id);
          swipeRef.current?.close();
        }}
        className="rounded-2xl items-center justify-center"
        style={{ backgroundColor: "#FCE4E4", width: 52, height: 52 }}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#E05C5C" />
      </Pressable>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={32}
      overshootRight={false}
      friction={2}
    >
      <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center" style={{ gap: 12 }}>
        {/* Checkbox */}
        <TasksCheckbox checked={task.isDone} onChange={() => {}} />

        {/* Vertical label colour bar */}
        <View
          className="rounded-full"
          style={{ width: 3, height: 36, backgroundColor: labelColor }}
        />

        {/* Title + date */}
        <View className="flex-1">
          <Text className="font-baloo text-base text-gray-800" numberOfLines={1}>
            {task.title}
          </Text>
          <Text className="font-balooThin text-xs text-gray-400">{endTimeDisplay}</Text>
        </View>

        {/* Days left */}
        <View className="items-center">
          <Text className="font-baloo text-3xl text-gray-800 leading-none">{daysLeft}</Text>
          <Text className="font-balooThin text-xs text-gray-400">days</Text>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
};

export default DdlCard;
