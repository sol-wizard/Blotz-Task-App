import { FlatList, TouchableWithoutFeedback, Keyboard, Pressable } from "react-native";
import { TaskStatusRow } from "../../../shared/components/task-status-row";
import { TaskListPlaceholder } from "./tasklist-placeholder";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useState } from "react";
import { TaskStatusType } from "../models/task-status-type";
import { filterSelectedTask } from "../util/task-counts";
import useSelectedDayTasks from "@/shared/hooks/useSelectedDayTasks";
import LoadingScreen from "@/shared/components/loading-screen";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import TaskCard from "./task-card";
import { useSwipeableManager } from "@/feature/notes/hooks/useSwipeableManager";

export const FilteredTaskList = ({
  selectedDay,
  onOpenMode,
}: {
  selectedDay: Date;
  onOpenMode: () => void;
}) => {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("To Do");

  const { deleteTask, isDeleting } = useTaskMutations();

  const { selectedDayTasks, isLoading } = useSelectedDayTasks({ selectedDay });

  const { onRowOpen, closeAllRows } = useSwipeableManager();

  const filteredSelectedDayTasks = filterSelectedTask({
    selectedDayTasks: selectedDayTasks ?? [],
  });
  const safeFilteredTasks = Array.isArray(filteredSelectedDayTasks) ? filteredSelectedDayTasks : [];
  const tasksOfSelectedStatus = safeFilteredTasks.find(
    (item) => item.status === selectedStatus,
  )?.tasks;
  const findStatusCount = (status: TaskStatusType) => {
    return filteredSelectedDayTasks.find((g) => g.status === status)?.count ?? 0;
  };

  const renderTask = ({ item }: { item: TaskDetailDTO }) => (
    <Animated.View
      entering={MotionAnimations.upEntering}
      exiting={MotionAnimations.leftExiting}
      layout={MotionAnimations.layout}
      className="shadow shadow-gray-200"
    >
      <TaskCard
        task={item}
        deleteTask={deleteTask}
        isDeleting={isDeleting}
        selectedDay={selectedDay}
        onOpenMode={onOpenMode}
        onRowOpen={onRowOpen}
      />
    </Animated.View>
  );

  return (
      <Animated.View className="flex-1" layout={MotionAnimations.layout}>
        <Animated.View layout={MotionAnimations.layout}>
          <TaskStatusRow
            allTaskCount={findStatusCount("All")}
            todoTaskCount={findStatusCount("To Do")}
            inProgressTaskCount={findStatusCount("In Progress")}
            overdueTaskCount={findStatusCount("Overdue")}
            doneTaskCount={findStatusCount("Done")}
            selectedStatus={selectedStatus}
            onChange={setSelectedStatus}
            selectedDay={selectedDay}
          />
        </Animated.View>

        {isLoading ? (
          <LoadingScreen />
        ) : tasksOfSelectedStatus && tasksOfSelectedStatus.length > 0 ? (
          <FlatList
            className="flex-1"
            data={tasksOfSelectedStatus}
            contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, gap: 12, flexGrow: 1 }}
            renderItem={renderTask}
            keyExtractor={(task) =>
              task.id != null ? `task-${task.id}` : `virtual-${task.recurringTaskId}`
            }
            onScrollBeginDrag={closeAllRows}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              <Pressable className="flex-1 min-h-96" onPress={closeAllRows} />
            }
          />
        ) : (
          <TaskListPlaceholder selectedStatus={selectedStatus} />
        )}
      </Animated.View>
  );
};
