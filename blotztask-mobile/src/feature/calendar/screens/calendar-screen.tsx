import React, { useState } from "react";
import { Snackbar } from "react-native-paper";
import { format } from "date-fns";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { CalendarProvider, DateData, WeekCalendar } from "react-native-calendars";
import { ActivityIndicator, FlatList, SafeAreaView, View } from "react-native";
import { ToggleAiTaskGenerate } from "@/feature/ai-task-generate/toggle-ai-task-generate";
import { createStatusSelectItems, filterTasksByStatus } from "../util/task-counts";
import { router } from "expo-router";
import { theme } from "@/shared/constants/theme";

import { TaskStatusSelect } from "../components/task-status-select";
import TaskCard from "../components/task-card";
import CalendarHeader from "../components/calendar-header";
import { TaskListPlaceholder } from "../components/tasklist-placeholder";
import useSelectedDayTasks from "@/feature/calendar/hooks/useSelectedDayTasks";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useSelectedTaskActions } from "@/shared/stores/selected-task-store";
import { TaskStatusType } from "../modals/task-status-type";
import { FilteredTaskList } from "../components/filtered-task-list";

export default function CalendarScreen() {
  const { selectedDay, setSelectedDay, tasksForSelectedDay, overdueTasks, isLoading } =
    useSelectedDayTasks();
  // const [snackbar, setSnackbar] = useState<{ visible: boolean; text: string }>({
  //   visible: false,
  //   text: "",
  // });
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("all");
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);

  const { toggleTask, removeTask, isToggling, isDeleting, deleteTaskError } = useTaskMutations();
  const { setSelectedTask } = useSelectedTaskActions();

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

  // const handleDeleteTask = async (taskId: number) => {
  //   try {
  //     await removeTask(taskId);
  //     setSnackbar({ visible: true, text: "Delete Successful" });
  //   } catch (e) {
  //     console.error(e);
  //     setSnackbar({
  //       visible: true,
  //       text: "Delete Failed, please try again later",
  //     });
  //   }
  // };

  return (
    <SafeAreaView className="flex-1">
      <CalendarHeader
        date={format(selectedDay, "yyyy-MM-dd")}
        isCalendarVisible={isCalendarVisible}
        onToggleCalendar={() => setIsCalendarVisible(!isCalendarVisible)}
      />
      <CalendarProvider
        date={format(selectedDay, "yyyy-MM-dd")}
        onDateChanged={(date: string) => setSelectedDay(new Date(date))}
        showTodayButton={false}
      >
        {isCalendarVisible && (
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
              textDayFontSize: 16,
            }}
            markedDates={{
              [format(new Date(), "yyyy-MM-dd")]: { marked: true, dotColor: "#CDF79A" },
            }}
            allowShadow={false}
            firstDay={1}
          />
        )}

        <FilteredTaskList />
      </CalendarProvider>

      <ToggleAiTaskGenerate />
      {/* TODO: fix, should appear in all kinds of error*/}
      {/* <Snackbar
        visible={!deleteTaskError}
        onDismiss={() => setSnackbar({ visible: false, text: "" })}
        duration={2200}
      >
        {snackbar.text}
      </Snackbar> */}
    </SafeAreaView>
  );
}
