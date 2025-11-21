import React, { useEffect, useState } from "react";
import { Snackbar, IconButton } from "react-native-paper";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { ActivityIndicator, FlatList, SafeAreaView, View, Text } from "react-native";
import { router } from "expo-router";
import { TaskStatusRow } from "@/shared/components/ui/task-status-row";
import TaskCard from "@/feature/calendar/components/task-card";
import { TaskListPlaceholder } from "@/feature/calendar/components/tasklist-placeholder";
import { getAllTasks } from "@/shared/services/task-service";
import UserProfile from "@/feature/calendar/components/user-profile";
import { TaskStatusType } from "@/feature/calendar/models/task-status-type";
import { filterSelectedTask } from "@/feature/calendar/util/task-counts";
import useTaskMutations from "@/shared/hooks/useTaskMutations";

export default function AllTasksScreen() {
  const [tasks, setTasks] = useState<TaskDetailDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("All");

  const { isDeleting, deleteTask, deleteTaskError, deleteTaskSuccess, resetDeleteTask } =
    useTaskMutations();

  const filteredTaskList = filterSelectedTask({ selectedDayTasks: tasks });
  const tasksOfSelectedStatus = filteredTaskList.find(
    (item) => item.status === selectedStatus,
  )?.tasks;

  const fetchTasks = async () => {
    try {
      const data = await getAllTasks();
      setTasks(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const renderTask = ({ item }: { item: TaskDetailDTO }) => (
    <View className="shadow shadow-gray-300">
      <TaskCard task={item} deleteTask={deleteTask} isDeleting={isDeleting} />
    </View>
  );

  return (
    <SafeAreaView className="flex-1">
      {/* Header with back button */}
      <View className="flex-row items-center px-5 pt-2">
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} iconColor="#6B7280" />
        <View className="flex-1 flex-row items-center justify-between">
          <Text className="text-5xl font-bold text-gray-800 font-balooExtraBold items-end pt-8">
            All Tasks
          </Text>
          <UserProfile />
        </View>
      </View>

      <TaskStatusRow
        allTaskCount={filteredTaskList.find((item) => item.status === "All")?.count ?? 0}
        todoTaskCount={filteredTaskList.find((item) => item.status === "To Do")?.count ?? 0}
        inProgressTaskCount={
          filteredTaskList.find((item) => item.status === "In Progress")?.count ?? 0
        }
        overdueTaskCount={filteredTaskList.find((item) => item.status === "Overdue")?.count ?? 0}
        doneTaskCount={filteredTaskList.find((item) => item.status === "Done")?.count ?? 0}
        selectedStatus={selectedStatus}
        onChange={setSelectedStatus}
      />

      {loading ? (
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
        duration={2200}
      >
        {deleteTaskError ? "Failed to delete task." : "Deleted task successfully!"}
      </Snackbar>
    </SafeAreaView>
  );
}
