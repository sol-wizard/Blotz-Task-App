/** "low" starts at 20% left; "paused" means the monthly cap for everyone is reached. */
export type AiCoachAllowanceState = "available" | "low" | "exhausted" | "paused";

export interface AiCoachAllowanceDto {
  /** Rounded down, 0–100. Can be 0 while still usable: show "<1%". */
  remainingPercent: number;
  state: AiCoachAllowanceState;
  /** Perth calendar date (yyyy-MM-dd) when the allowance and the cap reset. */
  resetsOn: string;
}

export const isAllowanceBlocked = (allowance: AiCoachAllowanceDto | undefined) =>
  allowance?.state === "exhausted" || allowance?.state === "paused";

/** "<1%" while some allowance is left but it rounds down to 0. */
export const formatRemainingPercent = (allowance: AiCoachAllowanceDto) =>
  allowance.remainingPercent === 0 && allowance.state !== "exhausted" ? "<1%" : `${allowance.remainingPercent}%`;

/** A calendar date, formatted without a time zone so it never shifts by a day. */
export function formatResetDate(resetsOn: string, language: string): string {
  const [year, month, day] = resetsOn.split("-").map(Number);
  if (language.startsWith("zh")) return `${month}月${day}日`;
  return new Intl.DateTimeFormat(language, { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}
