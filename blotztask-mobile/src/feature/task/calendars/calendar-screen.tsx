import React, { useState, useEffect } from "react";
import { SafeAreaView, FlatList } from "react-native";
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
import CalendarBottomSheet from "./calendar-bottomsheet";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<
    TaskDetailDTO[]
  >([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetailDTO | undefined>(
    undefined
  );
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

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
        {/* week Calenda */}
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
      {isBottomSheetVisible && (
        <CalendarBottomSheet
          task={selectedTask}
          isVisible={isBottomSheetVisible}
          onClose={handleBottomSheetClose}
        />
      )}
    </SafeAreaView>
  );
}
