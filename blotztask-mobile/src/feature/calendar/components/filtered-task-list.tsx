import { ActivityIndicator, FlatList, View } from "react-native";
import { TaskStatusRow } from "../../../shared/components/ui/task-status-row";
import { TaskListPlaceholder } from "./tasklist-placeholder";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import TaskCard from "./task-card";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { router } from "expo-router";
import { useState } from "react";
import { TaskStatusType } from "../modals/task-status-type";
import { filterSelectedTask } from "../util/task-counts";
import { Snackbar } from "react-native-paper";
import useSelectedDayTasks from "@/shared/hooks/useSelectedDayTasks";
import { useQueryClient } from "@tanstack/react-query";

export const FilteredTaskList = ({ selectedDay }: { selectedDay: Date }) => {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("All");

  const {
    toggleTask,
    deleteTask: removeTask,
    isToggling,
    isDeleting,
    deleteTaskSuccess,
    resetDeleteTask,
    deleteTaskError,
  } = useTaskMutations();

  const { selectedDayTasks, isLoading } = useSelectedDayTasks({ selectedDay });
  const queryClient = useQueryClient();

  const filteredSelectedDayTasks = filterSelectedTask(selectedDayTasks);
  const tasksOfSelectedStatus = filteredSelectedDayTasks.find(
    (item) => item.status === selectedStatus,
  )?.tasks;

  const navigateToTaskDetails = (task: TaskDetailDTO) => {
    queryClient.setQueryData(["taskId", task.id], task);
    router.push({
      pathname: "/(protected)/task-details",
      params: { taskId: task.id },
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

  const findStatusCount = (status: TaskStatusType) => {
    return filteredSelectedDayTasks.find((g) => g.status === status)?.count ?? 0;
  };

  return (
    <>
      <TaskStatusRow
        allTaskCount={findStatusCount("All")}
        todoTaskCount={findStatusCount("To Do")}
        inProgressTaskCount={findStatusCount("In Progress")}
        overdueTaskCount={findStatusCount("Overdue")}
        doneTaskCount={findStatusCount("Done")}
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
