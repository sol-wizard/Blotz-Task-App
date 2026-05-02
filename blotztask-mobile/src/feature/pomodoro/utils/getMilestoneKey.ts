export enum MilestoneKey {
  PHASE0 = "phase0",
  PHASE1 = "phase1",
  PHASE2 = "phase2",
  PHASE3 = "phase3",
}

export function getMilestoneKey(elapsedSeconds: number): MilestoneKey {
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 25) {
    return MilestoneKey.PHASE0;
  }

  if (elapsedMinutes >= 25 && elapsedMinutes < 30) {
    return MilestoneKey.PHASE1;
  }

  if (elapsedMinutes >= 55 && elapsedMinutes < 60) {
    return MilestoneKey.PHASE2;
  } else return MilestoneKey.PHASE3;
}
