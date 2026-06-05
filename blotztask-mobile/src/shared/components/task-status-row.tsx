import React from "react";
import { View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { TaskStatusType } from "../../feature/calendar/models/task-status-type";
import { TaskStatusButton } from "@/shared/components/task-status-button";

export function TaskStatusRow({
  allTaskCount,
  todoTaskCount,
  doneTaskCount,
  overdueTaskCount,
  selectedStatus,
  onChange,
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

  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0 }}
      className="py-3"
    >
      <View className="flex-row gap-2 px-4 items-center">
        <TaskStatusButton
          isSelected={selectedStatus === "To Do"}
          onChange={() => onChange("To Do")}
          statusName={t("status.toDo")}
          taskCount={todoTaskCount}
        />

        <TaskStatusButton
          isSelected={selectedStatus === "Overdue"}
          onChange={() => onChange("Overdue")}
          statusName={t("status.overdue")}
          taskCount={overdueTaskCount}
        />

        <TaskStatusButton
          isSelected={selectedStatus === "Done"}
          onChange={() => onChange("Done")}
          statusName={t("status.done")}
          taskCount={doneTaskCount}
        />

        <TaskStatusButton
          isSelected={selectedStatus === "All"}
          onChange={() => onChange("All")}
          statusName={t("status.all")}
          taskCount={allTaskCount}
        />
      </View>
    </ScrollView>
  );
}
