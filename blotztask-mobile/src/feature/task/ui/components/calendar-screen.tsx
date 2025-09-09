import React, { useState, useEffect } from "react";
<<<<<<< HEAD
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
=======
import {
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  View,
} from "react-native";
import {
  CalendarProvider,
  WeekCalendar,
  DateData,
} from "react-native-calendars";
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/calendars/calendar-screen.tsx
import { Snackbar } from "react-native-paper";
import { format, isSameDay } from "date-fns";
<<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
import CalendarHeader from "./calendar-header";
import NoGoalsView from "./noGoalsView";
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
import { fetchTasksForDate, toggleTaskCompletion, deleteTask } from "../../services/task-service";
=======
import { Snackbar } from "react-native-paper";
import { format, isSameDay } from "date-fns";
import CalendarHeader from "./calendar-header";
import NoGoalsView from "./noGoalsView";
<<<<<<< HEAD
import {
  fetchTasksForDate,
  toggleTaskCompletion,
  deleteTask,
} from "../../services/task-service";
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
import { fetchTasksForDate, toggleTaskCompletion, deleteTask } from "../../services/task-service";
>>>>>>> b91d27e (Bugs fix before launch (#481))
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { EditTaskBottomSheet } from "./edit-task-bottom-sheet";
import { useBottomSheetStore } from "../../store/bottomSheetStore";
import TaskCard from "./task-card";
import TaskDetailBottomSheet from "./task-detail-bottomsheet";
<<<<<<< HEAD
<<<<<<< HEAD
import { CalendarProvider, DateData, WeekCalendar } from "react-native-calendars";
import { ActivityIndicator, FlatList, SafeAreaView, View } from "react-native";
=======
import TaskCard from "../components/task-card";
========
import CalendarHeader from "./components/calendar-header";

>>>>>>>> 6eb4676 (Frontend refactor (#467)):blotztask-mobile/src/feature/task/ui/calendar-screen.tsx
import {
  fetchTasksForDate,
  toggleTaskCompletion,
  deleteTask,
} from "../services/task-service";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
<<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
import TaskDetailBottomSheet from "../components/task-detail-bottomsheet";
import { EditTaskBottomSheet } from "../task-edit/edit-task-bottom-sheet";
import { useBottomSheetStore } from "../util/bottomSheetStore";
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/calendars/calendar-screen.tsx
========

import { EditTaskBottomSheet } from "./components/edit-task-bottom-sheet";
import { useBottomSheetStore } from "../store/bottomSheetStore";
import TaskCard from "./components/task-card";
import TaskDetailBottomSheet from "./components/task-detail-bottomsheet";
import NoGoalsView from "./components/noGoalsView";
>>>>>>>> 6eb4676 (Frontend refactor (#467)):blotztask-mobile/src/feature/task/ui/calendar-screen.tsx

export default function CalendarPage({ refreshFlag }: { refreshFlag: boolean }) {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<TaskDetailDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
<<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx

  //TODO: Maybe we dont need this
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(undefined);
=======
  const [error, setError] = useState<string | null>(null);
========

  //TODO: Maybe we dont need this
>>>>>>>> 6eb4676 (Frontend refactor (#467)):blotztask-mobile/src/feature/task/ui/calendar-screen.tsx
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(
    undefined
  );
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/calendars/calendar-screen.tsx
=======
import {
  CalendarProvider,
  DateData,
  WeekCalendar,
} from "react-native-calendars";
=======
import { CalendarProvider, DateData, WeekCalendar } from "react-native-calendars";
>>>>>>> b91d27e (Bugs fix before launch (#481))
import { ActivityIndicator, FlatList, SafeAreaView, View } from "react-native";

export default function CalendarPage({ refreshFlag }: { refreshFlag: boolean }) {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<TaskDetailDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  //TODO: Maybe we dont need this
<<<<<<< HEAD
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(
    undefined
  );
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(undefined);
>>>>>>> b91d27e (Bugs fix before launch (#481))

  const [snackbar, setSnackbar] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });

  useEffect(() => {
<<<<<<< HEAD
<<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
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
=======
    const loadTasksForDate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const isToday = isSameDay(selectedDay, new Date());
        const tasks = await fetchTasksForDate(selectedDay, isToday);
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
========
    loadTask();
>>>>>>>> 6eb4676 (Frontend refactor (#467)):blotztask-mobile/src/feature/task/ui/calendar-screen.tsx
  }, [selectedDay]);
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/calendars/calendar-screen.tsx
=======
    loadTask();
<<<<<<< HEAD
  }, [selectedDay]);
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
  }, [selectedDay, refreshFlag]);
>>>>>>> b91d27e (Bugs fix before launch (#481))

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
<<<<<<< HEAD
<<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
      //TODO: Should refresh the tasks for the selected day instead of deleting at frontend
      setTasksForSelectedDay((prev) => prev.filter((t) => t.id !== taskId)); // delete at frontend
=======
      setTasksForSelectedDay((prev) => prev.filter((t) => t.id !== taskId));
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/calendars/calendar-screen.tsx
========
      //TODO: Should refresh the tasks for the selected day instead of deleting at frontend
      setTasksForSelectedDay((prev) => prev.filter((t) => t.id !== taskId)); // delete at frontend
>>>>>>>> 6eb4676 (Frontend refactor (#467)):blotztask-mobile/src/feature/task/ui/calendar-screen.tsx
=======
      //TODO: Should refresh the tasks for the selected day instead of deleting at frontend
      setTasksForSelectedDay((prev) => prev.filter((t) => t.id !== taskId)); // delete at frontend
>>>>>>> 6eb4676 (Frontend refactor (#467))
      setSnackbar({ visible: true, text: "Delete Successful" });
    } catch (e) {
      console.error(e);
      setSnackbar({
        visible: true,
        text: "Delete Failed, please try again later",
      });
<<<<<<< HEAD
<<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
========
>>>>>>>> 6eb4676 (Frontend refactor (#467)):blotztask-mobile/src/feature/task/ui/calendar-screen.tsx
=======
>>>>>>> 6eb4676 (Frontend refactor (#467))
      setSnackbar({
        visible: true,
        text: "Delete Failed, please try again later",
      });
<<<<<<< HEAD
<<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/calendar-screen.tsx
=======
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/calendars/calendar-screen.tsx
========
>>>>>>>> 6eb4676 (Frontend refactor (#467)):blotztask-mobile/src/feature/task/ui/calendar-screen.tsx
=======
>>>>>>> 6eb4676 (Frontend refactor (#467))
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
<<<<<<< HEAD
<<<<<<< HEAD
          onDayPress={(day: DateData) => setSelectedDay(new Date(day.dateString))}
=======
          onDayPress={(day: DateData) =>
            setSelectedDay(new Date(day.dateString))
          }
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
          onDayPress={(day: DateData) => setSelectedDay(new Date(day.dateString))}
>>>>>>> b91d27e (Bugs fix before launch (#481))
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
