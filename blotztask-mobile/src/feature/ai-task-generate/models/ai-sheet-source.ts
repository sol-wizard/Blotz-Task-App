/** Where the AI sheet was opened from, passed as the `source` route param. */
export const AI_SHEET_SOURCE = {
  /** The voice coach shown right after onboarding. */
  ONBOARDING: "onboarding",
} as const;

export type AiSheetSource = (typeof AI_SHEET_SOURCE)[keyof typeof AI_SHEET_SOURCE];
