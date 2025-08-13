import React, { useState, useEffect } from "react";
import { SafeAreaView, FlatList, View, Pressable } from "react-native";
import {
  CalendarProvider,
  WeekCalendar,
  DateData,
} from "react-native-calendars";
import { format } from "date-fns";
import CalendarHeader from "./calendar-header";
import NoGoalsView from "./noGoalsView";
import TaskCard from "../components/task-card";
import {
  fetchTasksForDate,
  toggleTaskCompletion,
} from "../services/task-service";
import TaskDetailBottomSheet from "./task-detail-bottomsheet";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { CreateTaskBottomSheet } from "../task-creation/create-task-bottom-sheet";
import { Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<
    TaskDetailDTO[]
  >([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(
    undefined
  );
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const [isTaskCreationSheetVisible, setIsTaskCreationSheetVisible] =
    useState(false);

  useEffect(() => {
    const loadTasksForDate = async () => {
      const tasks = await fetchTasksForDate(selectedDay);
      setTasksForSelectedDay(tasks);
    };

    loadTasksForDate();
  }, [selectedDay]);

  const handleToggleTask = async (task: TaskDetailDTO) => {
    await toggleTaskCompletion(task.id);

    const updatedTasks = await fetchTasksForDate(selectedDay);
    setTasksForSelectedDay(updatedTasks);
  };

  const handleTaskPress = (task: TaskDetailDTO) => {
    console.log("Task pressed:", task.title);
    setSelectedTask(task);
    setIsBottomSheetVisible(true);
    console.log("Bottom sheet should be visible now");
  };

  const handleBottomSheetClose = () => {
    setIsBottomSheetVisible(false);
    setSelectedTask(undefined);
  };

  const renderTask = ({ item }: { item: TaskDetailDTO }) => {
    const task = item as TaskDetailDTO;

    return (
      <TaskCard
        id={task.id.toString()}
        title={task.title}
        startTime="10:00am"
        endTime="11:00am"
        isCompleted={task.isDone}
        onToggleComplete={(id, completed) => {
          handleToggleTask(task);
        }}
        onPress={() => {
          handleTaskPress(task);
        }}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
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
          firstDay={1} // Monday as the first day of the week
        />
        {/* week+month Calendar */}
        {/* <ExpandableCalendar
            // initialPosition={ExpandableCalendar.positions.CLOSED}
            markedDates={marked}
            // markingType={'multi-dot'}
            current={selectedDay}
            theme={{
              selectedDayBackgroundColor: '#2d4150',
              todayTextColor: '#2d4150',
              arrowColor: '#2d4150',
              monthTextColor: '#2d4150',
              textMonthFontWeight: 'bold',
              textDayFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold',
            }}
            firstDay={1} // Monday as the first day of the week
            hideKnob={true}
          /> */}

        {tasksForSelectedDay.length > 0 ? (
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

      {isTaskCreationSheetVisible && (
        <CreateTaskBottomSheet
          isVisible={isTaskCreationSheetVisible}
          onClose={setIsTaskCreationSheetVisible}
        ></CreateTaskBottomSheet>
      )}

      {isBottomSheetVisible && (
        <TaskDetailBottomSheet
          task={selectedTask}
          isVisible={isBottomSheetVisible}
          onClose={handleBottomSheetClose}
        />
      )}
      <Portal>
        <View
          className="absolute left-0 right-0 items-center"
          style={{ bottom: insets.bottom + 20 }}
        >
          <Pressable
            onPress={() => setIsTaskCreationSheetVisible(true)}
            className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center"
            android_ripple={{ color: "#e5e7eb", borderless: true }}
          >
            <MaterialCommunityIcons name="plus" size={28} color="#6B7280" />
          </Pressable>
        </View>
      </Portal>
    </SafeAreaView>
  );
}
