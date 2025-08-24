import React, { useState, useEffect } from "react";
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
import { format } from "date-fns";
import CalendarHeader from "./calendar-header";
import NoGoalsView from "./noGoalsView";
import TaskCard from "../components/task-card";

import {
  fetchTasksForDate,
  toggleTaskCompletion,
} from "../services/task-service";

import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import TaskDetailBottomSheet from "../components/task-detail-bottomsheet";

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<
    TaskDetailDTO[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(
    undefined
  );

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
        startTime={task.startTime}
        endTime={task.endTime}
        isCompleted={task.isDone}
        onToggleComplete={(id, completed) => {
          handleToggleTask(task);
        }}
        onPress={() => {
          setSelectedTask(task);
          setIsBottomSheetVisible(true);
        }}
      />
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

      {isBottomSheetVisible && (
        <TaskDetailBottomSheet
          task={selectedTask}
          isVisible={isBottomSheetVisible}
          onClose={() => {
            setIsBottomSheetVisible(false);
            setSelectedTask(undefined);
          }}
        />
      )}
    </SafeAreaView>
  );
}
