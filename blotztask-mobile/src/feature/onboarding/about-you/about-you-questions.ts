export type AboutYouQuestion = {
  /** i18n key under `aboutYou.questions` and the `question` field on the events. */
  key: string;
  /** PostHog person property the answer is saved to. */
  property: string;
  multiSelect: boolean;
  options: readonly string[];
  /** Multi-select only: picking this option clears the others, and picking another clears it. */
  exclusiveOption?: string;
};

/**
 * The "About you" questions, in the order they are asked.
 *
 * Changing a question or an option is an edit here plus the matching text in
 * `locales/{en,zh}/onboarding.json` under `aboutYou.questions.<key>`.
 * Option keys are what PostHog stores, so keep them stable once shipped.
 */
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
    options: ["hardToStart", "distracted", "forgetful", "none"],
    exclusiveOption: "none",
  },
  {
    key: "source",
    property: "acquisition_source",
    multiSelect: false,
    options: ["rednote", "friend", "wechatGroup", "appStore", "otherSocial", "other"],
  },
] as const satisfies readonly AboutYouQuestion[];
