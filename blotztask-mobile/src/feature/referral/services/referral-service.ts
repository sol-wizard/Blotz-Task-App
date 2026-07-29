import { apiClient } from "@/shared/services/api/client";
import { ReferralCodeDTO } from "../models/referral-dto";

export const fetchMyReferralCode = async (): Promise<ReferralCodeDTO> => {
  return await apiClient.get<ReferralCodeDTO>("/referral/my-code");
};

export const redeemReferralCode = async (code: string): Promise<void> => {
  return await apiClient.post("/referral/redeem", { code });
};
