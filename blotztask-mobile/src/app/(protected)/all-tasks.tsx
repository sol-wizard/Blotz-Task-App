import React, { useState, useEffect } from "react";
import { Snackbar, IconButton } from "react-native-paper";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { ActivityIndicator, FlatList, SafeAreaView, View, Text } from "react-native";
import { createStatusSelectItems, filterTasksByStatus } from "@/feature/calendar/util/task-counts";
import { router } from "expo-router";
import { useSelectedTaskStore } from "@/shared/stores/selected-task-store";
import { TaskStatusSelect, TaskStatusType } from "@/feature/calendar/components/task-status-select";
import TaskCard from "@/feature/calendar/components/task-card";
import { TaskListPlaceholder } from "@/feature/calendar/components/tasklist-placeholder";
import { ToggleAiTaskGenerate } from "@/feature/ai-task-generate/toggle-ai-task-generate";
import { getAllTasks, toggleTaskCompletion, deleteTask } from "@/shared/services/task-service";
import UserProfile from "@/feature/calendar/components/user-profile";

export default function AllTasksScreen() {
  const [tasks, setTasks] = useState<TaskDetailDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("all");
  const { selectedTask, setSelectedTask } = useSelectedTaskStore();
  const [snackbar, setSnackbar] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });

  // Calculate overdue tasks from the all tasks list
  const overdueTasks = tasks.filter(
    (task) =>
      !task.isDone && task.endTime && new Date(task.endTime).getTime() <= new Date().getTime(),
  );

  const filteredTasks = filterTasksByStatus(tasks, selectedStatus, overdueTasks);
  const taskStatuses = createStatusSelectItems({
    tasks: tasks,
    overdueTaskCount: overdueTasks.length,
  });

  const fetchTasks = async () => {
    try {
      const data = await getAllTasks();
      setTasks(data);
    } catch (err: any) {
      console.error(err);
      setSnackbar({
        visible: true,
        text: "Failed to load tasks",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedTask]);

  const navigateToTaskDetails = (task: TaskDetailDTO) => {
    setSelectedTask(task);
    router.push({
      pathname: "/(protected)/task-details",
    });
  };

  const handleToggleTask = async (taskId: number) => {
    try {
      await toggleTaskCompletion(taskId);
      // Optimistically update the UI
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? { ...task, isDone: !task.isDone } : task)),
      );
    } catch (e) {
      console.error(e);
      setSnackbar({
        visible: true,
        text: "Failed to update task status",
      });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      setSnackbar({ visible: true, text: "Delete Successful" });
    } catch (e) {
      console.error(e);
      setSnackbar({
        visible: true,
        text: "Delete Failed, please try again later",
      });
    }
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
        onToggleComplete={() => handleToggleTask(item.id)}
        onPress={() => navigateToTaskDetails(item)}
        onDelete={async () => {
          await handleDeleteTask(item.id);
        }}
      />
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

      <TaskStatusSelect
        statuses={taskStatuses}
        selectedStatusId={selectedStatus}
        onChange={setSelectedStatus}
      />

      {loading ? (
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

      <ToggleAiTaskGenerate />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, text: "" })}
        duration={2200}
      >
        {snackbar.text}
      </Snackbar>
    </SafeAreaView>
  );
}
