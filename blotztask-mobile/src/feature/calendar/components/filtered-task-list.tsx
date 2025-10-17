import { ActivityIndicator, FlatList, View } from "react-native";
import { TaskStatusRow } from "./task-status-row";
import { TaskListPlaceholder } from "./tasklist-placeholder";
import useSelectedDayTasks from "../hooks/useSelectedDayTasks";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import TaskCard from "./task-card";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { router } from "expo-router";
import { useState } from "react";
import { TaskStatusType } from "../modals/task-status-type";
import { useSelectedTaskActions } from "@/shared/stores/selected-task-store";
import { filterSelectedTask } from "../util/task-counts";
import { Snackbar } from "react-native-paper";

export const FilteredTaskList = ({ selectedDay }: { selectedDay: Date }) => {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("All");

  const {
    toggleTask,
    removeTask,
    isToggling,
    isDeleting,
    deleteTaskSuccess,
    resetDeleteTask,
    deleteTaskError,
  } = useTaskMutations();
  const { setSelectedTask } = useSelectedTaskActions();
  const { selectedDayTasks, isLoading } = useSelectedDayTasks({ selectedDay });

  const filteredSelectedDayTasks = filterSelectedTask(selectedDayTasks);
  const tasksOfSelectedStatus = filteredSelectedDayTasks.find(
    (item) => item.status === selectedStatus,
  )?.tasks;

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
      <TaskStatusRow
        allTaskCount={filteredSelectedDayTasks.find((item) => item.status === "All")?.count ?? 0}
        todoTaskCount={filteredSelectedDayTasks.find((item) => item.status === "To Do")?.count ?? 0}
        inProgressTaskCount={
          filteredSelectedDayTasks.find((item) => item.status === "In Progress")?.count ?? 0
        }
        overdueTaskCount={
          filteredSelectedDayTasks.find((item) => item.status === "Overdue")?.count ?? 0
        }
        doneTaskCount={filteredSelectedDayTasks.find((item) => item.status === "Done")?.count ?? 0}
        selectedStatus={selectedStatus}
        onChange={setSelectedStatus}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" />
        </View>
      ) : tasksOfSelectedStatus && tasksOfSelectedStatus.length > 0 ? (
        <FlatList
          className="flex-1"
          data={tasksOfSelectedStatus}
          renderItem={renderTask}
          keyExtractor={(task) => task.id.toString()}
        />
      ) : (
        <TaskListPlaceholder selectedStatus={selectedStatus} />
      )}

      <Snackbar
        visible={deleteTaskSuccess || !!deleteTaskError}
        onDismiss={resetDeleteTask}
        duration={1500}
      >
        {deleteTaskError ? "Failed to delete task." : "Deleted task successfully!"}
      </Snackbar>
    </>
  );
};
