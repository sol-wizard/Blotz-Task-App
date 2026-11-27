import { useMutation } from "@tanstack/react-query";
import { BreakdownTaskTarget, startTaskBreakdown } from "../services/subtask-service";
import { TaskBreakdownStatusDTO } from "../models/task-breakdown-status-dto";
import { useBreakdownJobsStore } from "./useBreakdownJobsStore";

type StartTaskBreakdownVariables = {
  target: BreakdownTaskTarget;
  title: string;
};

// Asks the server to start a breakdown, then hands it to the BreakdownJobsWatcher to poll.
// The request returns at once, so it never waits for the AI.
export const useStartTaskBreakdown = () => {
  const track = useBreakdownJobsStore((state) => state.track);

  const mutation = useMutation<TaskBreakdownStatusDTO, Error, StartTaskBreakdownVariables>({
    mutationFn: ({ target }) => startTaskBreakdown(target),
    // Out of AI quota: say so, instead of a generic error the user would just retry.
    meta: { errorMap: { 429: "errors.aiQuotaExceeded" } },
    onSuccess: (status, { target, title }) => {
      track(status.taskItemId, { title, target, startedAt: Date.now() });
    },
  });

  return {
    startBreakdown: mutation.mutateAsync,
    isStartingBreakdown: mutation.isPending,
  };
};
