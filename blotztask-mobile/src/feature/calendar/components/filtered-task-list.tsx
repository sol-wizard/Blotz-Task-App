import { ActivityIndicator, FlatList, View } from "react-native";
import { TaskStatusSelect } from "./task-status-select";
import { TaskListPlaceholder } from "./tasklist-placeholder";
import { createStatusSelectItems, filterTasksByStatus } from "../util/task-counts";
import useSelectedDayTasks from "../hooks/useSelectedDayTasks";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import TaskCard from "./task-card";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { router } from "expo-router";
import { useState } from "react";
import { TaskStatusType } from "../modals/task-status-type";
import { useSelectedTaskActions } from "@/shared/stores/selected-task-store";

export const FilteredTaskList = () => {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("all");

  const { toggleTask, removeTask, isToggling, isDeleting } = useTaskMutations();
  const { setSelectedTask } = useSelectedTaskActions();

  const { tasksForSelectedDay, overdueTasks, isLoading } = useSelectedDayTasks();
  const filteredTasks = filterTasksByStatus(tasksForSelectedDay, selectedStatus, overdueTasks);
  const taskStatuses = createStatusSelectItems({
    tasks: tasksForSelectedDay,
    overdueTaskCount: overdueTasks.length,
  });

  const navigateToTaskDetails = (task: TaskDetailDTO) => {
    setSelectedTask(task);
    router.push({
      pathname: "/(protected)/task-details",
    });
  };

  const renderTask = ({ item }: { item: TaskDetailDTO }) => (
    <View className="shadow shadow-gray-300">
      <TaskCard
        id={item.id}
        title={item.title}
        startTime={item.startTime}
        endTime={item.endTime}
        isCompleted={item.isDone}
        labelColor={item.label?.color}
        onToggleComplete={() => toggleTask(item.id)}
        onPress={() => navigateToTaskDetails(item)}
        onDelete={async () => {
          await removeTask(item.id);
        }}
        isToggling={isToggling}
        isDeleting={isDeleting}
      />
    </View>
  );

  return (
    <>
      <TaskStatusSelect
        statuses={taskStatuses}
        selectedStatusId={selectedStatus}
        onChange={setSelectedStatus}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" />
        </View>
      ) : filteredTasks && filteredTasks.length > 0 ? (
        <FlatList
          className="flex-1"
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(task) => task.id.toString()}
        />
      ) : (
        <TaskListPlaceholder selectedStatus={selectedStatus} />
      )}
    </>
  );
};
