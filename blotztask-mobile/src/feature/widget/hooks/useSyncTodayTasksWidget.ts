import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueries } from "@tanstack/react-query";
import { addDays, parseISO, startOfDay } from "date-fns";

import { TASK_WIDGET_FUTURE_DAY_COUNT } from "@/feature/widget/config/widget-config";
import {
  buildWidgetTaskCache,
  getTaskWidgetDateKey,
  type TaskWidgetDaySource,
} from "@/feature/widget/util/task-widget-cache-util";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { fetchTasksForDate } from "@/shared/services/task-service";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { syncTodayTasksWidgetCache } from "@/feature/widget/services/today-tasks-widget-sync";
import { getTodayTasksWidgetMessage } from "@/feature/widget/util/today-tasks-widget-message";

type WidgetTaskQueryCollection = {
  isPending: boolean;
  daySources: TaskWidgetDaySource[];
};

type UseSyncTodayTasksWidgetParams = {
  enabled?: boolean;
};

export function useSyncTodayTasksWidget({
  enabled = true,
}: UseSyncTodayTasksWidgetParams = {}): void {
  const { i18n } = useTranslation("widget");
  const todayKey = getTaskWidgetDateKey(new Date());
  const dates = useMemo(() => {
    const today = startOfDay(parseISO(todayKey));
    return Array.from({ length: TASK_WIDGET_FUTURE_DAY_COUNT + 1 }, (_, index) =>
      addDays(today, index),
    );
  }, [todayKey]);

  const widgetTasks = useQueries({
    queries: dates.map((date) => ({
      queryKey: taskKeys.selectedDay(convertToDateTimeOffset(date)),
      queryFn: () => fetchTasksForDate(date, true),
      enabled,
      meta: { silent: true },
    })),
    combine: (results): WidgetTaskQueryCollection => ({
      isPending: results.some((result) => result.isPending),
      daySources: results.map((result, index) =>
        result.data
          ? { date: dates[index], status: "success", tasks: result.data }
          : { date: dates[index], status: "error" },
      ),
    }),
  });

  useEffect(() => {
    if (!enabled) return;
    if (widgetTasks.isPending) return;

    const widgetMessage = getTodayTasksWidgetMessage();
    syncTodayTasksWidgetCache(buildWidgetTaskCache(widgetTasks.daySources, widgetMessage));
  }, [enabled, i18n.language, widgetTasks]);
}
