import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueries } from "@tanstack/react-query";
import { addDays, startOfDay } from "date-fns";

import {
  buildTodayTasksWidgetCache,
  type TaskWidgetDaySource,
} from "@/feature/widget/util/task-widget-cache-util";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { fetchTasksForDate } from "@/shared/services/task-service";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { syncTodayTasksWidgetCache } from "@/feature/widget/services/today-tasks-widget-sync";

type WidgetTaskQueryCollection = {
  isPending: boolean;
  daySources: TaskWidgetDaySource[];
};

export function useSyncTodayTasksWidget(): void {
  const { i18n, t } = useTranslation("widget");
  const dates = Array.from({ length: 8 }, (_, index) => addDays(startOfDay(new Date()), index));

  const widgetTasks = useQueries({
    queries: dates.map((date) => ({
      queryKey: taskKeys.selectedDay(convertToDateTimeOffset(date)),
      queryFn: () => fetchTasksForDate(date, true),
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
    if (widgetTasks.isPending) return;

    syncTodayTasksWidgetCache(
      buildTodayTasksWidgetCache(widgetTasks.daySources, {
        title: t("today.title"),
        emptyMessage: t("today.emptyMessage"),
        footerText: t("today.footerText"),
      }),
    );
  }, [i18n.language, t, widgetTasks]);
}
