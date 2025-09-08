import React, { useState, useEffect } from "react";
import { Snackbar } from "react-native-paper";
import { format } from "date-fns";
import CalendarHeader from "./calendar-header";
import NoGoalsView from "./noGoalsView";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { EditTaskBottomSheet } from "./edit-task-bottom-sheet";
import { useBottomSheetStore } from "../../store/bottomSheetStore";
import TaskCard from "./task-card";
import TaskDetailBottomSheet from "./task-detail-bottomsheet";
import { CalendarProvider, DateData, WeekCalendar } from "react-native-calendars";
import { ActivityIndicator, FlatList, SafeAreaView, View } from "react-native";
import { useSelectedDayTaskStore } from "../../store/selectedDayTaskStore";

export default function CalendarPage() {
  const {
    selectedDay,
    tasksForSelectedDay,
    isLoading,
    setSelectedDay,
    loadTasks,
    toggleTask,
    removeTask,
  } = useSelectedDayTaskStore();

  //TODO: Maybe we dont need this
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(undefined);

  const [snackbar, setSnackbar] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });

  useEffect(() => {
    loadTasks();
  }, [selectedDay]);

  const { openTaskDetail } = useBottomSheetStore();

  const presentSheet = (task: TaskDetailDTO) => {
    setSelectedTask(task);
    openTaskDetail();
  };

  const renderTask = ({ item }: { item: TaskDetailDTO }) => (
    <TaskCard
      id={item.id.toString()}
      title={item.title}
      startTime={item.startTime}
      endTime={item.endTime}
      isCompleted={item.isDone}
      onToggleComplete={() => toggleTask(item.id)}
      onPress={() => presentSheet(item)}
      onDelete={async () => {
        await handleDeleteTask(item.id);
      }}
    />
  );

  const handleDeleteTask = async (taskId: number) => {
    try {
      //TODO: Should refresh the tasks for the selected day instead of deleting at frontend
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
            selectedDayBackgroundColor: "#2d4150",
            todayTextColor: "#2d4150",
            arrowColor: "#2d4150",
            monthTextColor: "#2d4150",
            textMonthFontWeight: "bold",
            textDayFontWeight: "bold",
            textDayHeaderFontWeight: "bold",
          }}
          allowShadow={false}
          firstDay={1}
        />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" />
          </View>
        ) : tasksForSelectedDay.length > 0 ? (
          <FlatList
            className="flex-1"
            data={tasksForSelectedDay}
            renderItem={renderTask}
            keyExtractor={(task) => task.id.toString()}
          />
        ) : (
          <NoGoalsView />
        )}
      </CalendarProvider>

      <TaskDetailBottomSheet task={selectedTask} />

      {selectedTask && <EditTaskBottomSheet task={selectedTask} />}

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
