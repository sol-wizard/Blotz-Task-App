import type { WebAuthErrorCodes } from "react-native-auth0";

export const EVENTS = {
  CREATE_TASK_MANUALLY: "create_task_manually",
  LOGIN_STARTED: "login_started",
  LOGIN_SUCCEEDED: "login_succeeded",
  LOGIN_FAILED: "login_failed",
  AI_TASK_GENERATION_SESSION: "ai_task_generation_session",
  AI_TASK_GENERATION_FAILED: "ai_task_generation_failed",
  ACTIVE_USER_5S: "active_user_5s",
  BREAKDOWN_TASK: "breakdown_task",
  SCREEN_VIEWED: "screen_viewed",
  NOTE_CREATED: "note_created",
  TASK_CREATED: "task_created",
  TASK_COMPLETED: "task_completed",
  TASK_REOPENED: "task_reopened",
  TASK_DELETED: "task_deleted",
  GASHAPON_SPIN: "gashapon_spin",
  POMODORO_STARTED: "pomodoro_started",
  BADGE_UNLOCKED: "badge_unlocked",
  REVIEW_GENERATED: "review_generated",
  SHARE_CLICKED: "share_clicked",
  SHARE_SHEET_OPENED: "share_sheet_opened",
  SHARE_COMPLETED: "share_completed",
  SHARE_FAILED: "share_failed",
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_VIEWED: "onboarding_step_viewed",
  ONBOARDING_COMPLETED: "onboarding_completed",
} as const;

export const SCREEN_NAMES = {
  SIGN_IN: "SignIn",
  NOTES: "Notes",
  GASHAPON_MACHINE: "GashaponMachine",
} as const;

/** Which sign-in button was used. `sms` is only rendered outside production. */
export type LoginConnection = "default" | "sms";

/**
 * Why a login attempt did not produce tokens.
 * `cancelled` and `browser_dismissed` are user exits rather than failures — exclude
 * them when measuring Auth0 reliability. `browser_dismissed` is kept separate because
 * on Android a swiped-away Custom Tab surfaces as `BROWSER_TERMINATED`, and folding it
 * into `auth0_error` would inflate the "Auth0 broke" bucket with users who just left.
 */
export type LoginFailureReason = "cancelled" | "browser_dismissed" | "no_tokens" | "auth0_error";

/**
 * Bounded to react-native-auth0's 18 `WebAuthErrorCodes`, plus our own token-shape check.
 * Raw error messages are never sent — they carry Auth0 descriptions and are unbounded.
 */
export type LoginErrorCode =
  | (typeof WebAuthErrorCodes)[keyof typeof WebAuthErrorCodes]
  | "NoTokensReturned";

/** How a task was created. `manual` = task form, `ai` = AI generation sheet. */
export type TaskSource = "manual" | "ai";

export type AiTaskOutcome = "accepted" | "rejected" | "abandoned";
export type AiTaskInputMode = "voice" | "text";
export type AiTaskFailureStage =
  | "permission"
  | "recording"
  | "send"
  | "transcription"
  | "generation";

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

// sharing records
export type ShareEvent =
  | typeof EVENTS.SHARE_CLICKED
  | typeof EVENTS.SHARE_SHEET_OPENED
  | typeof EVENTS.SHARE_COMPLETED
  | typeof EVENTS.SHARE_FAILED;

export type ShareSource = "weekly_review" | "monthly_review" | "badge";

export type ShareContentType = "review" | "badge";

// onboarding
export type OnboardingOutcome = "completed" | "skipped";

export type OnboardingSection = "ai-voice" | "note" | "breakdown";
