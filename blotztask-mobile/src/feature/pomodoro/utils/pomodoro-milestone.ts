export const MILESTONE_STEP_MINUTES = 30;

type MilestoneUnit = "minute" | "hour";

export interface MilestonePayload {
  milestoneMinutes: number;
  displayValue: string;
  unit: MilestoneUnit;
  unitCount: number;
}

export function getMilestoneMinutes(elapsedMinutes: number): number | null {
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < MILESTONE_STEP_MINUTES) return null;
  return Math.floor(elapsedMinutes / MILESTONE_STEP_MINUTES) * MILESTONE_STEP_MINUTES;
}

export function buildMilestonePayload(elapsedMinutes: number): MilestonePayload | null {
  const milestoneMinutes = getMilestoneMinutes(elapsedMinutes);
  if (milestoneMinutes == null) return null;

  if (milestoneMinutes < 60) {
    return {
      milestoneMinutes,
      displayValue: String(milestoneMinutes),
      unit: "minute",
      unitCount: milestoneMinutes,
    };
  }

  const hours = milestoneMinutes / 60;
  const displayValue = Number.isInteger(hours) ? String(hours) : String(hours.toFixed(1));

  return {
    milestoneMinutes,
    displayValue,
    unit: "hour",
    unitCount: hours,
  };
}
