// Icon `color=` values for the monthly-review screens, in one place so the raw
// hex isn't copy-pasted across components. These are passed to vector-icon
// `color` props, which (unlike `className`) can't read Tailwind tokens.
//
// NOTE: these intentionally differ slightly from the Tailwind tokens
// (e.g. token `secondary` is #444964) — kept as-is so the visuals don't change.
//
// TODO: investigate a single global color source. The app currently has three:
// tailwind.config.js (`secondary` #444964), theme.ts (`secondary` #D9D9D9 — conflicts!),
// and ~60 raw `color="#..."` props app-wide. This file is a 4th stopgap. The fix is a
// plain-JS `src/shared/constants/colors.js` that tailwind.config.js requires AND JS
// imports, so `className` and `color=` props can't drift. First decide whether this
// screen's #363853 is a real distinct color or just drift of #444964 (used 16× vs 4×).
export const REVIEW_ICON_COLOR = {
  secondary: "#363853",
  leafGreen: "#7AC74F",
  disabled: "#C7C9D6",
} as const;
