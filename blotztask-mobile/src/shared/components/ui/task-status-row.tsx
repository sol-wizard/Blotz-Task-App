import React from "react";
import { View, ScrollView, SafeAreaView } from "react-native";
import { TaskStatusType } from "../../../feature/calendar/models/task-status-type";
import { TaskStatusButton } from "@/shared/components/ui/task-status-button";
import { startOfDay, isBefore, isAfter } from "date-fns";

export function TaskStatusRow({
  allTaskCount,
  todoTaskCount,
  inProgressTaskCount,
  doneTaskCount,
  overdueTaskCount,
  selectedStatus,
  onChange,
  selectedDay,
}: {
  allTaskCount: number;
  todoTaskCount: number;
  inProgressTaskCount: number;
  doneTaskCount: number;
  overdueTaskCount: number;
  selectedStatus: TaskStatusType;
  onChange: (value: TaskStatusType) => void;
  selectedDay?: Date;
}) {
  // Determine if the selected day is past, today, or future
  const today = startOfDay(new Date());
  const selectedDate = selectedDay ? startOfDay(selectedDay) : today;

  const isPastDate = isBefore(selectedDate, today);
  const isFutureDate = isAfter(selectedDate, today);
  const isToday = !isPastDate && !isFutureDate;

  return (
    <SafeAreaView>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2 px-4 items-center py-4">
          <TaskStatusButton
            isSelected={selectedStatus === "All"}
            onChange={() => onChange("All")}
            statusName="All"
            taskCount={allTaskCount}
          />
          {(isToday || isFutureDate) && (
            <TaskStatusButton
              isSelected={selectedStatus === "To Do"}
              onChange={() => onChange("To Do")}
              statusName="To Do"
              taskCount={todoTaskCount}
            />
          )}
          {(isToday || isFutureDate) && (
            <TaskStatusButton
              isSelected={selectedStatus === "In Progress"}
              onChange={() => onChange("In Progress")}
              statusName="In Progress"
              taskCount={inProgressTaskCount}
            />
          )}
          {(isToday || isPastDate) && (
            <TaskStatusButton
              isSelected={selectedStatus === "Done"}
              onChange={() => onChange("Done")}
              statusName="Done"
              taskCount={doneTaskCount}
            />
          )}
          {(isToday || isPastDate) && (
            <TaskStatusButton
              isSelected={selectedStatus === "Overdue"}
              onChange={() => onChange("Overdue")}
              statusName="Overdue"
              taskCount={overdueTaskCount}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
