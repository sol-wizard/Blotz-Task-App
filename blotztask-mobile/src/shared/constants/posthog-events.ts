export const EVENTS = {
  CREATE_TASK_MANUALLY: "create_task_manually",
  CREATE_TASK_BY_AI: "create_task_by_ai",
  AI_PREVIEW_SHOWN: "ai_preview_shown",
  ACTIVE_USER_5S: "active_user_5s",
  BREAKDOWN_TASK: "breakdown_task",
  SCREEN_VIEWED: "screen_viewed",
} as const;

export const SCREEN_NAMES = {
  NOTES: "Notes",
  GASHAPON_MACHINE: "GashaponMachine",
} as const;

export type AiTaskOutcome = "accepted" | "rejected" | "abandoned";
