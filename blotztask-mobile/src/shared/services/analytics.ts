/* eslint-disable camelcase */
import posthog from "@/shared/constants/posthog-client";
import { EVENTS, SCREEN_NAMES, type AiTaskOutcome } from "@/shared/constants/posthog-events";

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
   * Fires when the AI successfully generates tasks/notes from the user's input.
   * This is Step 1 of the AI funnel — used to measure how often users
   * use the AI generation feature and what they ask for.
   */
  trackUserUsedAiGeneration(params: {
    userInput: string;
    generatedTaskCount: number;
    generatedNoteCount: number;
    generatedTaskTitles: string[];
    generatedNoteTexts: string[];
  }) {
    posthog.capture(EVENTS.AI_PREVIEW_SHOWN, {
      user_input: params.userInput,
      ai_generated_task_count: params.generatedTaskCount,
      ai_generated_note_count: params.generatedNoteCount,
      ai_generated_task_titles: params.generatedTaskTitles,
      ai_generated_note_texts: params.generatedNoteTexts,
    });
  },

  /**
   * Fires when the user takes action on the AI preview — either accepting
   * the generated tasks or going back to re-enter their input.
   * This is Step 2 of the AI funnel. "Abandoned" is derived in PostHog
   * from previews with no corresponding outcome event.
   */
  trackIfUserAcceptAiTask(params: {
    userInput?: string;
    outcome: AiTaskOutcome;
    generatedTaskCount: number;
    generatedNoteCount: number;
    addedTaskCount: number;
    addedNoteCount: number;
  }) {
    posthog.capture(EVENTS.CREATE_TASK_BY_AI, {
      ...(params.userInput !== undefined && { user_input: params.userInput }),
      outcome: params.outcome,
      ai_generated_task_count: params.generatedTaskCount,
      ai_generated_note_count: params.generatedNoteCount,
      user_add_task_count: params.addedTaskCount,
      user_add_note_count: params.addedNoteCount,
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
