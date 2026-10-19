/**
 * The "About you" questions, in the order they are asked.
 *
 * Changing a question or an option is an edit here plus the matching text in
 * `locales/{en,zh}/onboarding.json` under `about-you.questions.<key>`.
 * Option keys are what PostHog stores, so keep them stable once shipped.
 */
/**
 * Existing (already onboarded) users see the questions once, after the update that ships
 * them. Product decision; set to false to ask new users only.
 */
export const SHOW_ABOUT_YOU_TO_EXISTING_USERS = true;

export type AboutYouQuestion = {
  /** i18n key under `about-you.questions` and the `question` field on the events. */
  key: string;
  /** PostHog person property the answer is saved to. */
  property: string;
  multiSelect: boolean;
  options: readonly string[];
  /** Multi-select only: picking this option clears the others, and picking another clears it. */
  exclusiveOption?: string;
};

export const ABOUT_YOU_QUESTIONS = [
  {
    key: "need",
    property: "about_you_need",
    multiSelect: false,
    options: ["plan", "breakdown", "talk", "browse"],
  },
  {
    key: "struggles",
    property: "about_you_struggles",
    multiSelect: true,
    options: ["hard_to_start", "distracted", "forgetful", "none"],
    exclusiveOption: "none",
  },
  {
    key: "source",
    property: "acquisition_source",
    multiSelect: false,
    options: ["rednote", "friend", "wechat_group", "app_store", "other_social", "other"],
  },
] as const satisfies readonly AboutYouQuestion[];
