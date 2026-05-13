/* eslint-disable camelcase */
import posthog from "@/shared/constants/posthog-client";
import {
  EVENTS,
  SCREEN_NAMES,
  type AiTaskGenerationTurn,
  type AiTaskOutcome,
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
  trackManualTaskCreated() {
    posthog.capture(EVENTS.CREATE_TASK_MANUALLY);
  },

  /**
   * Fires once when the user leaves an AI task generation session.
   * Each turn pairs the user's prompt with the generated task/note state
   * returned by the AI after that prompt.
   */
  trackAiTaskGenerationSession(params: {
    outcome: AiTaskOutcome;
    turns: AiTaskGenerationTurn[];
  }) {
    posthog.capture(EVENTS.AI_TASK_GENERATION_SESSION, {
      outcome: params.outcome,
      input_modes: Array.from(new Set(params.turns.map((turn) => turn.input_mode))),
      turns: params.turns,
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
};
