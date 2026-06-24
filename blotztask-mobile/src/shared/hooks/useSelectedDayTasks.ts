import { useQuery } from "@tanstack/react-query";
import { fetchTasksForDate } from "../services/task-service";
import { isSameDay, startOfDay } from "date-fns";
import { taskKeys } from "../constants/query-key-factory";
import { convertToDateTimeOffset } from "../util/convert-to-datetimeoffset";
import { useEffect } from "react";
import {
  buildTodayTasksWidgetFallbackSnapshot,
  buildTodayTasksWidgetPlaceholderSnapshot,
  buildTodayTasksWidgetSnapshot,
} from "@/feature/widget/models/today-tasks-widget-snapshot";
import { syncTodayTasksWidgetSnapshot } from "@/feature/widget/services/today-tasks-widget-sync";
import type { TaskDetailDTO } from "@/shared/models/task-detail-dto";

const EMPTY_TASKS: TaskDetailDTO[] = [];

const useSelectedDayTasks = ({ selectedDay }: { selectedDay: Date }) => {
  const dayKey = convertToDateTimeOffset(startOfDay(selectedDay));

  const { data, isError, isLoading } = useQuery({
    queryKey: taskKeys.selectedDay(dayKey),
    queryFn: () => fetchTasksForDate(selectedDay, true),
  });
  const selectedDayTasks = data ?? EMPTY_TASKS;

  useEffect(() => {
    if (!isSameDay(selectedDay, new Date())) return;

    if (isLoading) {
      syncTodayTasksWidgetSnapshot(buildTodayTasksWidgetPlaceholderSnapshot());
      return;
    }

    if (isError) {
      syncTodayTasksWidgetSnapshot(buildTodayTasksWidgetFallbackSnapshot());
      return;
    }

    syncTodayTasksWidgetSnapshot(buildTodayTasksWidgetSnapshot(selectedDayTasks));
  }, [isError, isLoading, selectedDay, selectedDayTasks]);

  return {
    selectedDayTasks,
    isLoading,
  };
};

export default useSelectedDayTasks;
