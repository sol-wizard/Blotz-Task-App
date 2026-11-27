import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { breakdownKeys, subtaskKeys, taskKeys } from "@/shared/constants/query-key-factory";
import { analytics } from "@/shared/services/analytics";
import { getSubtasksByParentId, getTaskBreakdownStatus } from "../services/subtask-service";
import { RunningBreakdown, useBreakdownJobsStore } from "../hooks/useBreakdownJobsStore";
import { useStartTaskBreakdown } from "../hooks/useStartTaskBreakdown";
import { TASK_DETAIL_ROUTE_MODE } from "../util/task-detail-route-mode";

type PollerProps = {
  taskItemId: number;
  breakdown: RunningBreakdown;
  isAppActive: boolean;
  isViewingTask: boolean;
};

// Polls one running breakdown at the interval the server returns, then shows the result.
const BreakdownJobPoller = ({ taskItemId, breakdown, isAppActive, isViewingTask }: PollerProps) => {
  const { t } = useTranslation("tasks");
  const queryClient = useQueryClient();
  const untrack = useBreakdownJobsStore((state) => state.untrack);
  const { startBreakdown } = useStartTaskBreakdown();
  const finished = useRef(false);

  const { data } = useQuery({
    queryKey: breakdownKeys.status(taskItemId),
    queryFn: () => getTaskBreakdownStatus(taskItemId),
    // No polling while the app is in the background; it asks again as soon as it comes back.
    enabled: isAppActive,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data;
      return status?.status === "Running" && status.retryAfterSeconds != null
        ? status.retryAfterSeconds * 1000
        : false;
    },
    // A dropped connection while polling must never show the network error toast.
    meta: { silent: true },
  });

  useEffect(() => {
    if (!data || data.status === "Running" || finished.current) return;
    finished.current = true;
    untrack(taskItemId);
    queryClient.removeQueries({ queryKey: breakdownKeys.status(taskItemId) });
    // Refresh the list for every finished status, so no card keeps isBreakingDown and tracks it again.
    void queryClient.invalidateQueries({ queryKey: taskKeys.all });

    if (data.status === "Succeeded") {
      void onSucceeded();
    } else if (data.status === "Failed") {
      onFailed();
    }
    // status null: nothing is running for this task any more, so just stop polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const onSucceeded = async () => {
    const subtasks = await queryClient.fetchQuery({
      queryKey: subtaskKeys.all(taskItemId),
      queryFn: () => getSubtasksByParentId(taskItemId),
      staleTime: 0,
    });
    trackResult(true, subtasks.length);

    if (isViewingTask) return;
    Toast.show({
      type: "success",
      text1: t("details.breakdownDone", { title: breakdown.title }),
      onPress: () => {
        Toast.hide();
        router.push({
          pathname: "/(protected)/task-details",
          params: { mode: TASK_DETAIL_ROUTE_MODE.Persisted, taskId: taskItemId },
        });
      },
    });
  };

  const onFailed = () => {
    trackResult(false, 0);
    Toast.show({
      type: "error",
      text1: t("details.breakdownFailed"),
      onPress: () => {
        Toast.hide();
        void startBreakdown({ target: breakdown.target, title: breakdown.title });
      },
    });
  };

  const trackResult = (success: boolean, generatedSubtaskCount: number) => {
    if (breakdown.startedAt == null) return;
    analytics.trackTaskBreakdown({
      success,
      durationMs: Date.now() - breakdown.startedAt,
      generatedSubtaskCount,
    });
  };

  return null;
};

// Mounted once in the protected layout, so a breakdown is followed even after the user leaves its screen.
export const BreakdownJobsWatcher = () => {
  const running = useBreakdownJobsStore((state) => state.running);
  const pathname = usePathname();
  const { taskId } = useGlobalSearchParams<{ taskId?: string }>();
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setIsAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  const viewingTaskId = pathname === "/task-details" && taskId ? Number(taskId) : null;

  return (
    <>
      {Object.entries(running).map(([id, breakdown]) => (
        <BreakdownJobPoller
          key={id}
          taskItemId={Number(id)}
          breakdown={breakdown}
          isAppActive={isAppActive}
          isViewingTask={viewingTaskId === Number(id)}
        />
      ))}
    </>
  );
};
