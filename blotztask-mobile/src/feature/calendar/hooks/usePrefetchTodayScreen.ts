import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { selectedDayTasksQuery } from "@/shared/hooks/useSelectedDayTasks";
import { weekAvailabilityQuery } from "./useTaskDays";

/**
 * Starts the Today screen's requests as soon as the user is in, next to the post-login
 * gate's profile and preferences requests. Before, they waited for that gate to finish and
 * the screen to mount. Same query definitions as the screen's hooks, so they share the cache.
 */
export function usePrefetchTodayScreen() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const today = new Date();
    void queryClient.prefetchQuery(selectedDayTasksQuery(today));
    void queryClient.prefetchQuery(weekAvailabilityQuery(today));
  }, [queryClient]);
}
