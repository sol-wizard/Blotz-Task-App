import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueries, useQuery } from "@tanstack/react-query";
import { addDays, startOfDay } from "date-fns";

import {
  buildTaskWidgetSnapshots,
  type TaskWidgetDaySource,
} from "@/feature/widget/util/task-widget-cache-util";
import { selectedDayTasksQuery } from "@/shared/hooks/useSelectedDayTasks";
import { syncTodayTasksWidgetCache } from "@/feature/widget/services/tasks-widget-sync";

type WidgetTaskQueryCollection = {
  isPending: boolean;
  daySources: TaskWidgetDaySource[];
};

export function useSyncTodayTasksWidget(): void {
  const { i18n, t } = useTranslation("widget");
  const dates = Array.from({ length: 8 }, (_, index) => addDays(startOfDay(new Date()), index));

  // Today is the same query the Today screen shows, so it keeps that screen's error toast.
  // The other 7 days wait for it to settle: at launch they would compete with the request
  // the user is waiting for.
  const isTodaySettled = !useQuery(selectedDayTasksQuery(dates[0])).isPending;

  const widgetTasks = useQueries({
    queries: dates.map((date, index) =>
      index === 0
        ? selectedDayTasksQuery(date)
        : { ...selectedDayTasksQuery(date), meta: { silent: true }, enabled: isTodaySettled },
    ),
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
      buildTaskWidgetSnapshots(widgetTasks.daySources, {
        title: t("today.title"),
        emptyMessage: t("today.emptyMessage"),
      }),
    );
  }, [i18n.language, t, widgetTasks]);
}
