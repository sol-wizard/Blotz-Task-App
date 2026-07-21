import { apiClient } from "@/shared/services/api/client";
import { InviteCodeDTO } from "../models/invite-dto";

export const fetchMyInviteCode = async (): Promise<InviteCodeDTO> => {
  return await apiClient.get<InviteCodeDTO>("/invite/my-code");
};

export const redeemInviteCode = async (code: string): Promise<void> => {
  return await apiClient.post("/invite/redeem", { code });
};
