import { apiClient } from "@/shared/services/api/client";
import { RedeemReferralCodeResponseDTO, ReferralCodeDTO } from "../models/referral-dto";

export const fetchMyReferralCode = async (): Promise<ReferralCodeDTO> => {
  return await apiClient.get<ReferralCodeDTO>("/referral/my-code");
};

export const redeemReferralCode = async (code: string): Promise<RedeemReferralCodeResponseDTO> => {
  return await apiClient.post<RedeemReferralCodeResponseDTO>("/referral/redeem", { code });
};
