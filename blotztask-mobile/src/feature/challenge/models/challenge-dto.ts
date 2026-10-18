export type ChallengeStatus = "NotStarted" | "InProgress" | "Succeeded" | "Failed";

export interface ChallengeMemberDTO {
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
}

export interface CurrentChallengeDTO {
  id: string;
  name: string;
  status: ChallengeStatus;
  creatorUserId: string;
  requiredMembers: number;
  members: ChallengeMemberDTO[];
}
