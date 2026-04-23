export const MILESTONE_STEP_MINUTES = 30;

type MilestoneUnit = "minute" | "hour";

export interface MilestonePayload {
  milestoneMinutes: number;
  displayValue: string;
  unit: MilestoneUnit;
  unitCount: number;
}

/**
 * 0-29 => null
 * 30-59 => 30
 * 60-89 => 60
 * ...
 */
export function getMilestoneMinutes(elapsedMinutes: number): number | null {
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < MILESTONE_STEP_MINUTES) return null;
  return Math.floor(elapsedMinutes / MILESTONE_STEP_MINUTES) * MILESTONE_STEP_MINUTES;
}

/**
 * 把档位分钟转换为展示数据（value + unit）
 * - < 60 分钟: 分钟
 * - >= 60 分钟: 小时（支持 0.5 步进，因为 milestone 是 30 分钟）
 */
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
    unitCount: hours, // 给 i18n 复数规则用
  };
}
