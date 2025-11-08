import { FlatList, View } from "react-native";
import { TaskStatusRow } from "../../../shared/components/ui/task-status-row";
import { TaskListPlaceholder } from "./tasklist-placeholder";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import TaskCard from "./task-card";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useState } from "react";
import { TaskStatusType } from "../models/task-status-type";
import { filterSelectedTask } from "../util/task-counts";
import { Snackbar } from "react-native-paper";
import useSelectedDayTasks from "@/shared/hooks/useSelectedDayTasks";
import LoadingScreen from "@/shared/components/ui/loading-screen";

export const FilteredTaskList = ({ selectedDay }: { selectedDay: Date }) => {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("All");

  const { deleteTask, deleteTaskSuccess, resetDeleteTask, deleteTaskError, isDeleting } =
    useTaskMutations();

  const { selectedDayTasks, isLoading } = useSelectedDayTasks({ selectedDay });

  const filteredSelectedDayTasks = filterSelectedTask(selectedDayTasks ?? []);
  const safeFilteredTasks = Array.isArray(filteredSelectedDayTasks) ? filteredSelectedDayTasks : [];
  const tasksOfSelectedStatus = safeFilteredTasks.find(
    (item) => item.status === selectedStatus,
  )?.tasks;
  const findStatusCount = (status: TaskStatusType) => {
    return filteredSelectedDayTasks.find((g) => g.status === status)?.count ?? 0;
  };

  const renderTask = ({ item }: { item: TaskDetailDTO }) => (
    <View className="shadow shadow-gray-300">
      <TaskCard task={item} deleteTask={deleteTask} isDeleting={isDeleting} />
    </View>
  );

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
        selectedDay={selectedDay}
      />

      {isLoading ? (
        <LoadingScreen />
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
