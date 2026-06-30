import { apiClient } from "@/shared/services/api/client";
import { BadgeDTO } from "../models/badge-preview-dto";

export const fetchAllBadges = async (): Promise<BadgeDTO[]> => {
  return await apiClient.get<BadgeDTO[]>("/Badge");
};
