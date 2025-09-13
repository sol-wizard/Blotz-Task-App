import React, { useState, useEffect, useRef, useCallback } from "react";
import { Snackbar } from "react-native-paper";
import { format, isSameDay } from "date-fns";
import CalendarHeader from "./calendar-header";
import NoTasksView from "./no-tasks-view";
import { fetchTasksForDate, toggleTaskCompletion, deleteTask } from "../../services/task-service";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { EditTaskBottomSheet } from "./edit-task-bottom-sheet";
import TaskCard from "./task-card";
import TaskDetailBottomSheet from "./task-detail-bottomsheet";
import SubtaskDetail from "./subtask-detail-bottomsheet";
import { CalendarProvider, DateData, WeekCalendar } from "react-native-calendars";
import { ActivityIndicator, FlatList, SafeAreaView, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { fetchSubtasksForTask, fetchTotalHoursForTask } from "../../services/subtask-service";

export default function CalendarPage({ refreshFlag }: { refreshFlag: boolean }) {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<TaskDetailDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const taskDetailModalRef = useRef<BottomSheetModal>(null);
  const editTaskModalRef = useRef<BottomSheetModal>(null);
  const subtaskModalRef = useRef<BottomSheetModal>(null);
  const [subtasksForSelectedTask, setSubtasksForSelectedTask] = useState<any[]>([]);
  const [totalTimeForSelectedTask, setTotalTimeForSelectedTask] = useState("");

  //TODO: Maybe we dont need this
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(undefined);

  const [snackbar, setSnackbar] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });

  useEffect(() => {
    loadTask();
  }, [selectedDay, refreshFlag]);

  const loadTask = async () => {
    setIsLoading(true);
    try {
      const isToday = isSameDay(selectedDay, new Date());
      const tasks = await fetchTasksForDate(selectedDay, isToday);
      setTasksForSelectedDay(tasks);
    } catch (e) {
      console.error(e);
      setTasksForSelectedDay([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTask = async (task: TaskDetailDTO) => {
    try {
      await toggleTaskCompletion(task.id);
      const isToday = isSameDay(selectedDay, new Date());
      const updatedTasks = await fetchTasksForDate(selectedDay, isToday);
      setTasksForSelectedDay(updatedTasks);
    } catch (e) {
      console.error(e);
    }
  };

  const presentSheet = (task: TaskDetailDTO) => {
    setSelectedTask(task);
    taskDetailModalRef?.current?.present();
  };

  const handleEditTaskSheetClose = () => {
    editTaskModalRef?.current?.dismiss();
    taskDetailModalRef?.current?.present();
  };

  const handleEditPress = () => {
    taskDetailModalRef?.current?.dismiss();
    editTaskModalRef?.current?.present();
  };

  const renderTask = ({ item }: { item: TaskDetailDTO }) => (
    <TaskCard
      id={item.id.toString()}
      title={item.title}
      startTime={item.startTime}
      endTime={item.endTime}
      isCompleted={item.isDone}
      onToggleComplete={() => handleToggleTask(item)}
      onPress={() => presentSheet(item)}
      onDelete={async () => {
        await handleDeleteTask(item.id);
      }}
    />
  );

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      //TODO: Should refresh the tasks for the selected day instead of deleting at frontend
      setTasksForSelectedDay((prev) => prev.filter((t) => t.id !== taskId)); // delete at frontend
      setSnackbar({ visible: true, text: "Delete Successful" });
    } catch (e) {
      console.error(e);
      setSnackbar({
        visible: true,
        text: "Delete Failed, please try again later",
      });
      setSnackbar({
        visible: true,
        text: "Delete Failed, please try again later",
      });
    }
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.5}
      />
    ),
    [],
  );

  const handleOpenSubtasks = async (task: TaskDetailDTO) => {
    setSelectedTask(task);

    try {
      const items = await fetchSubtasksForTask(task.id);
      setSubtasksForSelectedTask(items ?? []);

      const { label } = await fetchTotalHoursForTask(task.id, items ?? []);
      setTotalTimeForSelectedTask(label);
    } catch (e) {
      console.error(e);
      setSubtasksForSelectedTask([]);
      setTotalTimeForSelectedTask("");
    }

    subtaskModalRef.current?.present();
  };

  const handleToggleSubtask = (id: number) => {
    setSubtasksForSelectedTask((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isDone: !s.isDone } : s)),
    );
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
          <NoTasksView />
        )}
      </CalendarProvider>

      <BottomSheetModal
        ref={taskDetailModalRef}
        snapPoints={["60%", "80%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <TaskDetailBottomSheet
          task={selectedTask}
          handleEditPress={handleEditPress}
          onOpenSubtasks={handleOpenSubtasks}
        />
      </BottomSheetModal>

      {selectedTask && (
        <BottomSheetModal
          ref={editTaskModalRef}
          snapPoints={["55%"]}
          keyboardBlurBehavior="restore"
          backdropComponent={renderBackdrop}
          enablePanDownToClose
        >
          <EditTaskBottomSheet task={selectedTask} handleClose={handleEditTaskSheetClose} />
        </BottomSheetModal>
      )}

      <BottomSheetModal
        ref={subtaskModalRef}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <BottomSheetView className="flex-1">
          <SubtaskDetail
            task={selectedTask}
            subtasks={subtasksForSelectedTask}
            totalTaskTime={totalTimeForSelectedTask}
            onToggleSubtask={handleToggleSubtask}
          />
        </BottomSheetView>
      </BottomSheetModal>

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
