import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  View,
  Text,
} from "react-native";
import {
  CalendarProvider,
  WeekCalendar,
  DateData,
} from "react-native-calendars";
import { Snackbar } from "react-native-paper";

import { format } from "date-fns";
import CalendarHeader from "./calendar-header";
import NoGoalsView from "./noGoalsView";
import TaskCard from "../components/task-card";
import {
  fetchTasksForDate,
  toggleTaskCompletion,
  deleteTask,
} from "../services/task-service";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import TaskDetailBottomSheet, {
  TaskDetailBottomSheetHandle,
} from "../components/task-detail-bottomsheet";

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<
    TaskDetailDTO[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(
    undefined
  );
  const taskDetailSheetRef = useRef<TaskDetailBottomSheetHandle>(null);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });

  useEffect(() => {
    const loadTasksForDate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tasks = await fetchTasksForDate(selectedDay);
        setTasksForSelectedDay(tasks);
      } catch (e) {
        console.error(e);
        setError("Failed to load tasks");
        setTasksForSelectedDay([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasksForDate();
  }, [selectedDay]);

  const handleToggleTask = async (task: TaskDetailDTO) => {
    try {
      await toggleTaskCompletion(task.id);
      const updatedTasks = await fetchTasksForDate(selectedDay);
      setTasksForSelectedDay(updatedTasks);
    } catch (e) {
      console.error(e);
    }
  };

  const renderTask = ({ item }: { item: TaskDetailDTO }) => {
    const task = item as TaskDetailDTO;

    return (
      <TaskCard
        id={task.id.toString()}
        title={task.title}
        startTime={task.hasTime ? format(task.endTime, "p") : undefined}
        isCompleted={task.isDone}
        onToggleComplete={(id, completed) => {
          handleToggleTask(task);
        }}
        onPress={() => {
          setSelectedTask(task);
          taskDetailSheetRef.current?.present();
        }}
        onDelete={async () => {
        await handleDeleteTask(task.id); // ✅ 传给子组件
      }}
      />
    );
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);                        // 调用你的 API
      setTasksForSelectedDay(prev => prev.filter(t => t.id !== taskId)); // 前端移除
      setSnackbar({ visible: true, text: "Delete Successful" });
    } catch (e) {
      console.error(e);
      setSnackbar({ visible: true, text: "删除失败，请稍后重试" }); // 你已有的提示
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
          onDayPress={(day: DateData) =>
            setSelectedDay(new Date(day.dateString))
          }
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
          firstDay={1}
        />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Text>Failed to load tasks</Text>
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

      <TaskDetailBottomSheet
        ref={taskDetailSheetRef}
        task={selectedTask}
        onDismiss={() => {
          setSelectedTask(undefined);
        }}
      />

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
