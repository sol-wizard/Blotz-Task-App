export type MilestoneKey = "phase0" | "phase1" | "phase2" | "phase3";

export function getMilestoneKey(elapsedSeconds: number): MilestoneKey {
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 25) {
    return "phase0";
  }

  if (elapsedMinutes >= 25 && elapsedMinutes < 30) {
    return "phase1";
  }

  if (elapsedMinutes >= 55 && elapsedMinutes < 60) {
    return "phase2";
  } else return "phase3";
}
