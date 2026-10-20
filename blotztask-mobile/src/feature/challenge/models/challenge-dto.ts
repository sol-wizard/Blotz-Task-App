export type ChallengeStatus = "NotStarted" | "InProgress" | "Succeeded" | "Failed";

export interface ChallengeMemberDTO {
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
  /** One entry per challenge day, true when they were active that day. Empty before it starts. */
  activeDays: boolean[];
}

export interface CurrentChallengeDTO {
  id: string;
  name: string;
  status: ChallengeStatus;
  creatorUserId: string;
  requiredMembers: number;
  periodDays: number;
  startTime: string | null;
  members: ChallengeMemberDTO[];
}

export interface ChallengeHistoryItemDTO {
  id: string;
  name: string;
  status: ChallengeStatus;
  startTime: string | null;
  endTime: string;
}
