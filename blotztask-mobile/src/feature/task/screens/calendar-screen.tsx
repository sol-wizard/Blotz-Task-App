import React, { useState, useEffect } from "react";
import { Snackbar } from "react-native-paper";
import { format } from "date-fns";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import TaskCard from "../components/ui/task-card";
import { CalendarProvider, DateData, WeekCalendar } from "react-native-calendars";
import { ActivityIndicator, FlatList, SafeAreaView, View } from "react-native";
import { useSelectedDayTaskStore } from "../stores/selectedday-task-store";
import CalendarHeader from "../components/calender/calendar-header";
import { ToggleAiTaskGenerate } from "@/feature/ai-task-generate/component/toggle-ai-task-generate";
import { TaskStatusSelect, TaskStatusType } from "../components/ui/task-status-select";
import { createStatusSelectItems, filterTasksByStatus } from "../util/task-counts";
import { TaskListPlaceholder } from "../components/calender/tasklist-placeholder";
import { router } from "expo-router";
import { theme } from "@/shared/constants/theme";

export default function CalendarScreen() {
  const {
    selectedDay,
    tasksForSelectedDay,
    isLoading,
    setSelectedDay,
    loadTasks,
    toggleTask,
    removeTask,
    overdueTasks,
  } = useSelectedDayTaskStore();
  const [snackbar, setSnackbar] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });

  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("all");
  const filteredTasks = filterTasksByStatus(tasksForSelectedDay, selectedStatus, overdueTasks);
  const taskStatuses = createStatusSelectItems({
    tasks: tasksForSelectedDay,
    overdueTaskCount: overdueTasks.length,
  });

  useEffect(() => {
    loadTasks();
  }, [selectedDay, loadTasks]);

  const navigateToTaskDetails = (task: TaskDetailDTO) => {
    router.push({
      pathname: "/(protected)/task-details",
      params: {
        taskId: task.id.toString(),
        title: task.title,
        description: task.description,
        startTime: task.startTime,
        endTime: task.endTime,
        isDone: task.isDone.toString(),
        label: task.label?.name || "No Label",
      },
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
        onToggleComplete={() => toggleTask(item.id)}
        onPress={() => navigateToTaskDetails(item)}
        onDelete={async () => {
          await handleDeleteTask(item.id);
        }}
      />
    </View>
  );

  const handleDeleteTask = async (taskId: number) => {
    try {
      await removeTask(taskId);
      setSnackbar({ visible: true, text: "Delete Successful" });
    } catch (e) {
      console.error(e);
      setSnackbar({
        visible: true,
        text: "Delete Failed, please try again later",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <CalendarHeader date={format(selectedDay, "yyyy-MM-dd")} />
      <CalendarProvider
        date={format(selectedDay, "yyyy-MM-dd")}
        onDateChanged={(date: string) => setSelectedDay(new Date(date))}
        showTodayButton={false}
      >
        <WeekCalendar
          onDayPress={(day: DateData) => setSelectedDay(new Date(day.dateString))}
          current={format(selectedDay, "yyyy-MM-dd")}
          theme={{
            calendarBackground: "#F5F9FA",
            selectedDayBackgroundColor: "#EBF0FE",
            selectedDayTextColor: theme.colors.heading,
            dayTextColor: theme.colors.disabled,
            todayTextColor: theme.colors.disabled,
            textDayFontWeight: "bold",
            textDayFontFamily: "InterBold",
            textDayHeaderFontFamily: "InterThin",
            textDayFontSize: 14,
          }}
          markedDates={{
            [format(new Date(), "yyyy-MM-dd")]: { marked: true, dotColor: "#CDF79A" },
          }}
          allowShadow={false}
          firstDay={1}
        />

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
      </CalendarProvider>

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
