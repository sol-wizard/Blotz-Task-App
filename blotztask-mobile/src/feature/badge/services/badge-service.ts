import { apiClient } from "@/shared/services/api/client";
import { BadgeDTO } from "../models/badge-preview-dto";
import { BadgeDetailDTO } from "../models/badge-by-id-dto";

export const fetchAllBadges = async (): Promise<BadgeDTO[]> => {
  return await apiClient.get<BadgeDTO[]>("/Badge");
};

export const fetchBadgeDetailById = async (badgeId: number): Promise<BadgeDetailDTO> => {
  return await apiClient.get<BadgeDetailDTO>(`/Badge/${badgeId}`);
};
