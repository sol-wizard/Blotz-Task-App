import { create } from "zustand";
import { BreakdownTaskTarget } from "../services/subtask-service";

export type RunningBreakdown = {
  title: string;
  // What to send again when the user retries a failed breakdown.
  target: BreakdownTaskTarget;
  // When this phone started the breakdown, for the analytics duration. Null when it was picked up
  // from the task list (started earlier or on another device), so its duration is unknown.
  startedAt: number | null;
};

interface BreakdownJobsState {
  /** Breakdowns the server is still running, by task id. The BreakdownJobsWatcher polls each one. */
  running: Record<number, RunningBreakdown>;
  track: (taskItemId: number, breakdown: RunningBreakdown) => void;
  untrack: (taskItemId: number) => void;
}

export const useBreakdownJobsStore = create<BreakdownJobsState>((set) => ({
  running: {},
  track: (taskItemId, breakdown) =>
    set((state) =>
      state.running[taskItemId] ? state : { running: { ...state.running, [taskItemId]: breakdown } },
    ),
  untrack: (taskItemId) =>
    set((state) => {
      if (!state.running[taskItemId]) return state;
      const { [taskItemId]: _done, ...rest } = state.running;
      return { running: rest };
    }),
}));

export const useIsBreakingDown = (taskItemId: number | null) =>
  useBreakdownJobsStore((state) => taskItemId != null && taskItemId in state.running);
