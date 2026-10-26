import { BadgeDetailDTO } from "@/feature/badge/models/badge-detail-dto";

export interface RedeemReferralCodeResponseDTO {
  /** Null when no badge was awarded, e.g. its row isn't in the database yet. */
  badge: BadgeDetailDTO | null;
}

export interface ReferralCodeDTO {
  code: string;
  redemptionCount: number;
  targetCount: number | null;
  badgeIconUrl: string | null;
  hasEarnedBadge: boolean;
}
