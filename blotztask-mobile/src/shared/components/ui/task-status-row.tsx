import React from "react";
import { View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { TaskStatusType } from "../../../feature/tasks/models/task-status-type";
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
  const { t } = useTranslation("calendar");

  // Determine if the selected day is past, today, or future
  const today = startOfDay(new Date());
  const selectedDate = selectedDay ? startOfDay(selectedDay) : today;

  const isPastDate = isBefore(selectedDate, today);
  const isFutureDate = isAfter(selectedDate, today);
  const isToday = !isPastDate && !isFutureDate;

  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0 }}
      className="py-3"
    >
      <View className="flex-row gap-2 px-4 items-center">
        <TaskStatusButton
          isSelected={selectedStatus === "All"}
          onChange={() => onChange("All")}
          statusName={t("status.all")}
          taskCount={allTaskCount}
        />

        <TaskStatusButton
          isSelected={selectedStatus === "To Do"}
          onChange={() => onChange("To Do")}
          statusName={t("status.toDo")}
          taskCount={todoTaskCount}
        />

        <TaskStatusButton
          isSelected={selectedStatus === "In Progress"}
          onChange={() => onChange("In Progress")}
          statusName={t("status.inProgress")}
          taskCount={inProgressTaskCount}
        />

        <TaskStatusButton
          isSelected={selectedStatus === "Done"}
          onChange={() => onChange("Done")}
          statusName={t("status.done")}
          taskCount={doneTaskCount}
        />

        {(isToday || isPastDate) && (
          <TaskStatusButton
            isSelected={selectedStatus === "Overdue"}
            onChange={() => onChange("Overdue")}
            statusName={t("status.overdue")}
            taskCount={overdueTaskCount}
          />
        )}
      </View>
    </ScrollView>
  );
}
