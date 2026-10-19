import { apiClient } from "@/shared/services/api/client";
import { BadgePreviewDTO } from "../models/badge-preview-dto";
import { BadgeDetailDTO } from "../models/badge-detail-dto";

export const fetchAllBadges = async (): Promise<BadgePreviewDTO[]> => {
  return await apiClient.get<BadgePreviewDTO[]>("/Badge");
};

export const fetchBadgeDetailById = async (badgeId: number): Promise<BadgeDetailDTO> => {
  return await apiClient.get<BadgeDetailDTO>(`/Badge/${badgeId}`);
};

export const equipBadge = async (badgeId: number): Promise<void> => {
  await apiClient.post<void>(`/Badge/${badgeId}/equip`);
};
