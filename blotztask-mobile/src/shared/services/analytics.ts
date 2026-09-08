/* eslint-disable camelcase */
import { ReviewPeriodType } from "@/feature/review/models/review-dto";
import posthog from "@/shared/constants/posthog-client";
import {
  EVENTS,
  SCREEN_NAMES,
  type AiTaskFailureStage,
  type AiTaskGenerationTurn,
  type AiTaskInputMode,
  type AiTaskOutcome,
  type MicPermissionOutcome,
  type LoginConnection,
  type LoginErrorCode,
  type LoginFailureReason,
  type TaskSource,
  type ShareEvent,
  type ShareSource,
  type ShareContentType,
  type OnboardingOutcome,
  type OnboardingSection,
} from "@/shared/constants/posthog-events";

type ScreenName = (typeof SCREEN_NAMES)[keyof typeof SCREEN_NAMES];

export const analytics = {
  /**
   * Links an anonymous PostHog user to a real Auth0 identity.
   * Called once when the user enters the authenticated area.
   * Enables tracking the same person across sessions, reinstalls, and devices.
   */
  identifyUser(userId: string, profile?: { email?: string; name?: string }) {
    const userProperties: Record<string, string> = {};
    if (profile?.email) userProperties.email = profile.email;
    if (profile?.name) userProperties.name = profile.name;
    posthog.identify(userId, userProperties);
  },

  /**
   * Clears the current PostHog identity.
   * Called on logout so the next login starts as a fresh anonymous user.
   */
  resetUser() {
    posthog.reset();
  },

  /**
   * Tracks which screens users navigate to.
   * Used to understand feature discovery and navigation patterns.
   */
  trackScreenViewed(screenName: ScreenName) {
    posthog.capture(EVENTS.SCREEN_VIEWED, { screen_name: screenName });
  },

  /**
   * Fires the instant a sign-in button is tapped, before the Auth0 browser opens.
   * This is the denominator the login funnel has never had: without it, an install that
   * never logs in cannot be told apart from one that tried and failed.
   * Fires while the user is still anonymous — the client runs `personProfiles: "always"`
   * so PostHog joins these to the identified person at `$identify`.
   */
  trackLoginStarted(params: { connection: LoginConnection }) {
    posthog.capture(EVENTS.LOGIN_STARTED, { connection: params.connection });
  },

  /**
   * Fires once Auth0 returns both an access and a refresh token, before the redirect
   * into `(protected)`. Deliberately emitted pre-`identify` so the whole login funnel
   * sits on one anonymous distinct_id.
   * Note this is not proof the user reached the app — it fires before `refreshAuthState`
   * and the redirect, so pair it with the screen views to measure that last hop.
   */
  trackLoginSucceeded(params: { connection: LoginConnection; durationMs: number }) {
    posthog.capture(EVENTS.LOGIN_SUCCEEDED, {
      connection: params.connection,
      duration_ms: params.durationMs,
    });
  },

  /**
   * Fires on every non-success exit from Auth0 — the three branches that were previously
   * silent `console.error` calls and left half our installs unexplained.
   * `reason` separates a deliberate cancel and a dismissed browser from a genuine
   * failure, so Auth0 reliability can be measured without user exits polluting it.
   * `duration_ms` is what makes a cancel interpretable: near-zero means a mis-tap or a
   * browser that failed to open, while tens of seconds means real abandonment at the
   * Auth0 form — two very different fixes.
   */
  trackLoginFailed(params: {
    connection: LoginConnection;
    reason: LoginFailureReason;
    errorCode: LoginErrorCode;
    durationMs: number;
  }) {
    posthog.capture(EVENTS.LOGIN_FAILED, {
      connection: params.connection,
      reason: params.reason,
      error_code: params.errorCode,
      duration_ms: params.durationMs,
    });
  },

  /** Fires when the user reaches the onboarding screen. */
  trackOnboardingStarted() {
    posthog.capture(EVENTS.ONBOARDING_STARTED);
  },

  /** Fires when an onboarding section becomes visible. */
  trackOnboardingStepViewed(params: { step: OnboardingSection }) {
    posthog.capture(EVENTS.ONBOARDING_STEP_VIEWED, {
      step: params.step,
    });
  },

  /**
   * Fires after the user's onboarded state is persisted.
   * `outcome` separates users who reached the final tutorial section from users who skipped.
   */
  trackOnboardingCompleted(params: {
    outcome: OnboardingOutcome;
    exit_section: OnboardingSection;
  }) {
    posthog.capture(EVENTS.ONBOARDING_COMPLETED, {
      outcome: params.outcome,
      last_section_reached: params.exit_section,
    });
  },

  /**
   * We treat a user as "active" if they stay on the app for more than 5 seconds.
   * Fires once per calendar day. Used to calculate Daily Active Users (DAU) and retention.
   */
  trackDailyActiveUser(date: string) {
    posthog.capture(EVENTS.ACTIVE_USER_5S, {
      seconds: 5,
      day: date,
      source: "foreground",
    });
  },

  /**
   * Tracks when a user creates a task via the manual form (not AI).
   * Used to compare manual vs AI task creation volume.
   */
  trackManualTaskCreated(params?: { is_recurring?: boolean; is_deadline?: boolean }) {
    posthog.capture(EVENTS.CREATE_TASK_MANUALLY, {
      is_recurring: params?.is_recurring ?? false,
      is_deadline: params?.is_deadline ?? false,
    });
  },

  /**
   * Fires once when the user leaves an AI task generation session.
   * Each turn pairs the user's prompt with the generated task/note state
   * returned by the AI after that prompt.
   */
  trackAiTaskGenerationSession(params: { outcome: AiTaskOutcome; turns: AiTaskGenerationTurn[] }) {
    // Avoid logging empty input to PostHog — empty input is usually caused by a backend failure or similar.
    if (params.turns.length === 0) return;

    posthog.capture(EVENTS.AI_TASK_GENERATION_SESSION, {
      outcome: params.outcome,
      input_modes: Array.from(new Set(params.turns.map((turn) => turn.input_mode))),
      turns: params.turns,
    });
  },

  /**
   * Fires whenever an AI task generation attempt fails — covers client-side issues
   * (mic permission, recording, send) and backend errors (transcription, generation).
   * Use this to monitor reliability and slice by input mode, stage, and error code.
   */
  trackAiTaskGenerationFailed(params: {
    inputMode: AiTaskInputMode | "unknown";
    stage: AiTaskFailureStage;
    errorCode: string;
    durationMs?: number;
  }) {
    const properties: Record<string, string | number> = {
      input_mode: params.inputMode,
      stage: params.stage,
      error_code: params.errorCode,
    };
    if (params.durationMs !== undefined) properties.duration_ms = params.durationMs;
    posthog.capture(EVENTS.AI_TASK_GENERATION_FAILED, properties);
  },

  /**
   * Fires when the AI sheet mounts. The denominator for AI attempts: the session event fires
   * only on exit and drops itself when no turn was recorded, so opens were previously invisible.
   */
  trackAiTaskSheetOpened() {
    posthog.capture(EVENTS.AI_TASK_SHEET_OPENED);
  },

  /**
   * Fires once per AI sheet open, when the mic permission question has an answer.
   * `outcome` is classified from the state read *before* asking; that is the only way to
   * separate a fresh rejection (`denied`) from one the OS will not re-prompt for (`blocked`).
   */
  trackMicPermissionResolved(params: { outcome: MicPermissionOutcome; errorCode?: string }) {
    posthog.capture(EVENTS.MIC_PERMISSION_RESOLVED, {
      outcome: params.outcome,
      ...(params.errorCode ? { error_code: params.errorCode } : {}),
    });
  },

  /**
   * Fires after the AI task breakdown completes (success or failure).
   * Tracks whether the breakdown worked, how long it took, and how many
   * subtasks were generated. Used to monitor AI reliability and performance.
   */
  trackTaskBreakdown(params: {
    success: boolean;
    durationMs: number;
    generatedSubtaskCount: number;
  }) {
    posthog.capture(EVENTS.BREAKDOWN_TASK, {
      success: params.success,
      duration_ms: params.durationMs,
      subtask_count: params.generatedSubtaskCount,
    });
  },

  trackNoteCreated(params: { source: "manual" | "ai" }) {
    posthog.capture(EVENTS.NOTE_CREATED, { source: params.source });
  },

  /**
   * Fires when a task is created — the counterpart to the completion events, carrying the same
   * `task_id` so created → completed can be joined in PostHog. `source` separates manual vs AI
   * creation. Recurring tasks fire this once per series (`task_id` = `recurringTaskId`), while
   * `task_completed` fires per occurrence, so filter `is_recurring` when computing a completion
   * rate. Preset tasks are seeded server-side and never fire this, so they are excluded naturally.
   */
  trackTaskCreated(params: {
    taskId: number;
    source: TaskSource;
    isRecurring: boolean;
    hasDeadline: boolean;
  }) {
    posthog.capture(EVENTS.TASK_CREATED, {
      task_id: params.taskId,
      source: params.source,
      is_recurring: params.isRecurring,
      has_deadline: params.hasDeadline,
    });
  },

  /**
   * Fires when a user marks a task as complete — the core value moment for a to-do app.
   * Only fires on genuine completion, never when un-completing a task.
   * Carries `task_id` so creation → completion can be joined in PostHog once task creation
   * is tracked, enabling completion-rate and "do completers retain better?" analysis.
   */
  trackTaskCompleted(params: {
    taskId: number;
    isRecurring: boolean;
    wasOverdue: boolean;
    hasDeadline: boolean;
    occurrenceDate?: string;
  }) {
    posthog.capture(EVENTS.TASK_COMPLETED, {
      task_id: params.taskId,
      is_recurring: params.isRecurring,
      was_overdue: params.wasOverdue,
      has_deadline: params.hasDeadline,
      ...(params.occurrenceDate ? { occurrence_date: params.occurrenceDate } : {}),
    });
  },

  /**
   * Fires when a user un-completes a task (checks it back off).
   * A high reopen rate can hint at accidental completions or unclear task state.
   */
  trackTaskReopened(params: { taskId: number }) {
    posthog.capture(EVENTS.TASK_REOPENED, { task_id: params.taskId });
  },

  /**
   * Fires when a user deletes a task. A high delete rate can signal low-quality
   * AI output or users giving up on stale tasks. Shares `task_id` with the rest
   * of the task lifecycle. `was_overdue` / `has_deadline` are only available for
   * normal tasks (recurring deletes don't carry the full task).
   */
  trackTaskDeleted(params: {
    taskId: number;
    isRecurring: boolean;
    wasOverdue?: boolean;
    hasDeadline?: boolean;
    occurrenceDate?: string;
  }) {
    posthog.capture(EVENTS.TASK_DELETED, {
      task_id: params.taskId,
      is_recurring: params.isRecurring,
      ...(params.wasOverdue !== undefined ? { was_overdue: params.wasOverdue } : {}),
      ...(params.hasDeadline !== undefined ? { has_deadline: params.hasDeadline } : {}),
      ...(params.occurrenceDate ? { occurrence_date: params.occurrenceDate } : {}),
    });
  },

  trackGashaponSpin() {
    posthog.capture(EVENTS.GASHAPON_SPIN);
  },

  trackPomodoroStarted(params: { isCountdown: boolean; durationMinutes: number }) {
    posthog.capture(EVENTS.POMODORO_STARTED, {
      is_countdown: params.isCountdown,
      duration_minutes: params.durationMinutes,
    });
  },

  trackBadgeUnlocked(params: { badgeId: number }) {
    posthog.capture(EVENTS.BADGE_UNLOCKED, { badge_id: params.badgeId });
  },

  trackReviewGenerated(params: { period: ReviewPeriodType }) {
    posthog.capture(EVENTS.REVIEW_GENERATED, { period: params.period });
  },

  // sharing
  trackShare(
    event: ShareEvent,
    params: {
      source: ShareSource;
      contentType: ShareContentType;
      error?: string;
    },
  ) {
    posthog.capture(event, {
      source: params.source,
      content_type: params.contentType,
      ...(params.error ? { error: params.error } : {}),
    });
  },
};
