export interface ReferralCodeDTO {
  code: string;
  redemptionCount: number;
  targetCount: number | null;
  badgeIconUrl: string | null;
}
