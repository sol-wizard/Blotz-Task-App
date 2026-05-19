export const EVENTS = {
  CREATE_TASK_MANUALLY: "create_task_manually",
  AI_TASK_GENERATION_SESSION: "ai_task_generation_session",
  ACTIVE_USER_5S: "active_user_5s",
  BREAKDOWN_TASK: "breakdown_task",
  SCREEN_VIEWED: "screen_viewed",
} as const;

export const SCREEN_NAMES = {
  NOTES: "Notes",
  GASHAPON_MACHINE: "GashaponMachine",
} as const;

export type AiTaskOutcome = "accepted" | "rejected" | "abandoned";
export type AiTaskInputMode = "voice" | "text";

export type AiTaskGenerationTurn = {
  turn_index: number;
  input_mode: AiTaskInputMode;
  user_input: string;
  generated_tasks: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    task_label: string;
  }[];
  generated_notes: {
    text: string;
  }[];
};
